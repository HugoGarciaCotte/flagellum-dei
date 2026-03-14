import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getScenarioById } from "@/data/scenarios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy } from "lucide-react";

import PlayerListSheet from "@/components/PlayerListSheet";
import { parseWikitext, extractImageUrls } from "@/lib/parseWikitext";
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

const HostGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { t } = useTranslation();

  const [localSection, setLocalSection] = useState<string | null>(null);

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

  const effectiveScenario = game ? getScenarioById(game.scenario_id) : null;
  const scenarioContent = effectiveScenario?.content || "";
  const parsed = useMemo(() => parseWikitext(scenarioContent), [scenarioContent]);
  const sections = parsed.sections;
  const scenarioMeta = parsed.metadata;

  useEffect(() => {
    const urls = extractImageUrls(scenarioContent);
    if (urls.length > 0) { for (const url of urls) { const img = new Image(); img.src = url; } }
  }, [scenarioContent]);

  const activeSection = localSection ?? game?.current_section ?? null;

  useEffect(() => { if (game) setLocalSection(null); }, [game?.current_section]);

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase.channel(`game-host-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => { pullAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase.channel(`game-players-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, () => { pullAll(); })
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
      navigator.clipboard.writeText(game.join_code);
      toast({ title: t("game.copied"), description: t("game.joinCodeCopied") });
    }
  };

  const activateSection = async (sectionId: string) => {
    setLocalSection(sectionId);
    if (!game) return;
    upsertRow("games", { ...game, current_section: sectionId, updated_at: new Date().toISOString() });
    try { await supabase.from("games").update({ current_section: sectionId } as any).eq("id", game.id); } catch {}
    triggerPush();
  };

  if (!game) return <FullPageLoader message={t("game.loadingQuest")} />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader
        title={effectiveScenario?.title ?? ""}
        leftAction={<Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>}
        badge={
          <>
            {scenarioMeta.scenario_level && (
              <span className="text-xs font-normal bg-primary/20 text-primary px-2 py-0.5 rounded-full">{t("game.level").replace("{level}", String(scenarioMeta.scenario_level))}</span>
            )}
            {!online && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{t("game.offline")}</span>}
          </>
        }
        rightActions={
          <>
            <Button variant="outline" size="sm" onClick={copyCode} className="gap-2 border-primary/30 font-mono tracking-widest">
              <Copy className="h-3 w-3" /> {game.join_code}
            </Button>
            <PlayerListSheet players={players} characters={characters} gameId={gameId!} />
            <Button variant="destructive" size="sm" onClick={endGame} className="gap-1">
              <span className="text-sm" aria-hidden="true">🝎</span> {t("game.end")}
            </Button>
          </>
        }
      />

      <main className="flex-1 container py-6 max-w-5xl">
        {sections.length > 0 ? (
          <Card className="w-full aged-border gold-glow-box">
            <CardContent className="p-4">
              <WikiSectionTree sections={sections} activeSection={activeSection} onActivateSection={activateSection} />
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

      {!window.matchMedia('(display-mode: standalone)').matches && (
        <p className="text-center py-4">
          <Link to="/install" className="text-xs text-muted-foreground/50 hover:text-primary transition-colors font-display">
            {t("dashboard.installApp")}
          </Link>
        </p>
      )}

      <GameTimer />
      <DiceRoller gameId={gameId} userName={t("game.gameMaster")} isGameMaster={true} />
    </div>
  );
};

export default HostGame;
