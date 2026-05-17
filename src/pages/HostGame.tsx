import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getScenarioById } from "@/data/scenarios";
import { loadScenarioOverrides } from "@/lib/scenarioOverrides";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, AlertTriangle, Loader2 } from "lucide-react";

import PlayerListSheet from "@/components/PlayerListSheet";
import { parseWikitext, extractImageUrls, findSection, resolveAmbianceTrack, resolvePlaylist, type PlaylistInfo } from "@/lib/parseWikitext";
import { getBy } from "@/lib/localStore";
import WikiSectionTree from "@/components/WikiSectionTree";
import DiceRoller from "@/components/DiceRoller";
import GameTimer from "@/components/GameTimer";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";

import { useLocalRow, useLocalRows } from "@/hooks/useLocalData";
import { upsertRow } from "@/lib/localStore";
import { triggerPush, pullTable } from "@/lib/syncManager";
import { useTranslation } from "@/i18n/useTranslation";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import { normalizeScenarioId } from "@/lib/scenarioIds";

const HostGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, syncReady } = useAuth();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { t, locale } = useTranslation();

  const [localSection, setLocalSection] = useState<string | null>(null);
  const [overridesLoaded, setOverridesLoaded] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Load scenario overrides from DB so edited content is used
  useEffect(() => {
    loadScenarioOverrides().then(() => setOverridesLoaded(true));
  }, []);

  const game = useLocalRow<any>("games", gameId);
  const allPlayers = useLocalRows<any>("game_players", gameId ? { game_id: gameId } : undefined);
  const allCharacters = useLocalRows<any>("characters");
  const allProfiles = useLocalRows<any>("profiles");

  const players = useMemo(() => {
    return allPlayers.map((p: any) => {
      const profile = allProfiles.find((pr: any) => pr.user_id === p.user_id);
      return { ...p, profiles: profile ? { display_name: profile.display_name } : undefined };
    });
  }, [allPlayers, allProfiles]);

  const playerUserIds = useMemo(() => [...new Set(allPlayers.map((p: any) => p.user_id as string))], [allPlayers]);
  const characters = useMemo(() => allCharacters.filter((c: any) => playerUserIds.includes(c.user_id)), [allCharacters, playerUserIds]);

  const effectiveScenario = game ? getScenarioById(game.scenario_id, locale) : null;
  const scenarioContent = effectiveScenario?.content || "";
  const parsed = useMemo(() => parseWikitext(scenarioContent), [scenarioContent]);
  const sections = parsed.sections;
  const scenarioMeta = parsed.metadata;

  useEffect(() => {
    const urls = extractImageUrls(scenarioContent);
    if (urls.length > 0) { for (const url of urls) { const img = new Image(); img.src = url; } }
  }, [scenarioContent]);

  const activeSection = localSection ?? game?.current_section ?? null;

  // Resolve ambiance track for the active section (inherits downward)
  const resolvedAmbianceTrack = useMemo(() => {
    if (!activeSection) return parsed.ambianceTrack;
    function walkAndResolve(
      secs: typeof sections,
      parentTrack: typeof parsed.ambianceTrack
    ): typeof parsed.ambianceTrack {
      for (const s of secs) {
        const track = s.ambianceTrack || parentTrack;
        if (s.id === activeSection) return track;
        const found = walkAndResolve(s.children, track);
        if (found !== undefined) return found;
      }
      return undefined;
    }
    return walkAndResolve(sections, parsed.ambianceTrack) ?? parsed.ambianceTrack;
  }, [activeSection, sections, parsed.ambianceTrack]);

  // Resolve effective playlist for the active section (inherits downward)
  const resolvedPlaylist = useMemo((): PlaylistInfo | null => {
    if (!activeSection) return null;
    function walkPlaylist(
      secs: typeof sections,
      parentPlaylist: PlaylistInfo | null
    ): PlaylistInfo | null {
      for (const s of secs) {
        const effective = resolvePlaylist(s, parentPlaylist);
        if (s.id === activeSection) return effective;
        const found = walkPlaylist(s.children, effective);
        if (found) return found;
      }
      return null;
    }
    return walkPlaylist(sections, null);
  }, [activeSection, sections]);

  // Single track playback triggered by inline buttons
  const [playTrackUrl, setPlayTrackUrl] = useState<string | null>(null);

  const handlePlayTrack = useCallback((url: string) => {
    // Force re-trigger even if same track by toggling
    setPlayTrackUrl(null);
    setTimeout(() => setPlayTrackUrl(url), 0);
  }, []);

  // Targeted pull if game missing after initial sync (e.g. direct URL navigation)
  useEffect(() => {
    if (!syncReady || game || !gameId || !online) return;
    pullTable("games", { id: gameId });
    pullTable("game_players", { game_id: gameId });
  }, [syncReady, game, gameId, online]);

  useEffect(() => { if (game) setLocalSection(null); }, [game?.current_section]);

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase.channel(`game-host-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => { pullTable("games", { id: gameId }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase.channel(`game-players-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, async () => {
        await pullTable("game_players", { game_id: gameId });
        const updatedPlayers = getBy("game_players", { game_id: gameId });
        const uids = [...new Set(updatedPlayers.map((p: any) => p.user_id as string))];
        for (const uid of uids) {
          await pullTable("characters", { user_id: uid });
          await pullTable("profiles", { user_id: uid });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  const endGame = async () => {
    if (!game) return;
    upsertRow("games", { ...game, status: "ended", updated_at: new Date().toISOString() });
    try { await supabase.from("games").update({ status: "ended" }).eq("id", game.id); } catch {}
    triggerPush();
    navigate("/");
  };

  const copyCode = () => {
    if (game) {
      navigator.clipboard.writeText(`${window.location.origin}/join/${game.join_code}`);
      toast({ title: t("game.copied"), description: t("game.joinLinkCopied") });
    }
  };

  const retryPublish = useCallback(async (silent = false) => {
    if (!game || !user) return;
    if (!navigator.onLine) {
      if (!silent) toast({ title: t("game.offlineRetry"), variant: "destructive" });
      return;
    }
    setRetrying(true);
    try {
      const normalizedScenarioId = normalizeScenarioId(game.scenario_id) ?? game.scenario_id;
      const { error } = await supabase.from("games").upsert({
        id: game.id, host_user_id: user.id, scenario_id: normalizedScenarioId,
        join_code: game.join_code, status: game.status ?? "active",
        current_section: game.current_section ?? null,
      }, { onConflict: "id" });
      if (error) {
        if (!silent) toast({ title: t("game.publishFailed"), description: error.message, variant: "destructive" });
        return;
      }
      upsertRow("games", { ...game, scenario_id: normalizedScenarioId, pending_sync: false });
      if (!silent) toast({ title: t("game.publishedToast") });
    } catch (e: any) {
      if (!silent) toast({ title: t("game.publishFailed"), description: e?.message, variant: "destructive" });
    } finally {
      setRetrying(false);
    }
  }, [game, user, t]);

  // Auto-retry silently when coming back online
  useEffect(() => {
    if (!game?.pending_sync) return;
    const handler = () => { retryPublish(true); };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [game?.pending_sync, retryPublish]);

  const activateSection = async (sectionId: string) => {
    setLocalSection(sectionId);
    if (!game) return;
    upsertRow("games", { ...game, current_section: sectionId, updated_at: new Date().toISOString() });
    try { await supabase.from("games").update({ current_section: sectionId } as any).eq("id", game.id); } catch {}
    triggerPush();
  };

  if (!syncReady || !game) return <FullPageLoader message={t("game.loadingQuest")} />;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <PageHeader
        title={effectiveScenario?.title ?? ""}
        leftAction={<Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>}
        badge={
          <>
            {scenarioMeta.scenario_level && (
              <span className="text-sm font-normal bg-primary/20 text-primary px-2 py-0.5 rounded-full">{t("game.level").replace("{level}", String(scenarioMeta.scenario_level))}</span>
            )}
            {!online && <span className="text-sm bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{t("game.offline")}</span>}
          </>
        }
        rightActions={
          <>
            {game.pending_sync ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryPublish(false)}
                disabled={retrying}
                title={t("game.notPublishedHint")}
                className="gap-1 sm:gap-2 border-destructive/60 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                <span>{retrying ? t("game.publishing") : t("game.notPublishedRetry")}</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={copyCode} className="gap-1 sm:gap-2 border-primary/30 font-mono tracking-widest">
                <span className="hidden sm:inline font-sans font-medium tracking-normal">{t("game.joinCode")} :</span> {game.join_code} <Copy className="h-3 w-3" />
              </Button>
            )}
            <PlayerListSheet players={players} characters={characters} gameId={gameId!} />
            <Button variant="destructive" size="sm" onClick={endGame} className="gap-1">
              <span className="text-sm" aria-hidden="true">🝎</span> <span className="hidden sm:inline">{t("game.end")}</span>
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto">
      <main className="container py-6 max-w-5xl pb-20">
        {sections.length > 0 ? (
          <Card className="w-full aged-border gold-glow-box">
            <CardContent className="p-4">
              <WikiSectionTree sections={sections} activeSection={activeSection} onActivateSection={activateSection} onPlayTrack={handlePlayTrack} />
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full aged-border gold-glow-box">
            <CardContent className="p-8">
              <div className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {scenarioContent || t("game.noContent")}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      </div>

      <SpotifyPlayer position="left" playlistUrl={resolvedPlaylist?.url} playlistName={resolvedPlaylist?.name} playTrackUrl={playTrackUrl ?? undefined} />
      <GameTimer ambianceTrack={resolvedAmbianceTrack} position="right" hasActiveSection={!!activeSection} />
      <DiceRoller gameId={gameId} userName={t("game.gameMaster")} isGameMaster={true} position="right" />
    </div>
  );
};

export default HostGame;
