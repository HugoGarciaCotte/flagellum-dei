import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getScenarioById } from "@/data/scenarios";
import { loadScenarioOverrides } from "@/lib/scenarioOverrides";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseWikitext, findSection, resolveBackgroundImage, extractImageUrls, WikiSection } from "@/lib/parseWikitext";
import { ArrowLeft, Plus, Check, X, GripHorizontal, Pencil, Copy } from "lucide-react";
import CharacterSheet from "@/components/CharacterSheet";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { toast } from "@/hooks/use-toast";
import DiceRoller from "@/components/DiceRoller";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";
import CharacterCreationWizard from "@/components/CharacterCreationWizard";
import CharacterListItem from "@/components/CharacterListItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocalRow, useLocalRows } from "@/hooks/useLocalData";
import { upsertRow } from "@/lib/localStore";
import { triggerPush, pullTable } from "@/lib/syncManager";
import { useTranslation } from "@/i18n/useTranslation";

const PlayGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { t } = useTranslation();

  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [creatingChar, setCreatingChar] = useState(false);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [scenarioReady, setScenarioReady] = useState(false);

  useEffect(() => {
    loadScenarioOverrides().then(() => setScenarioReady(true)).catch(() => setScenarioReady(true));
  }, []);

  const game = useLocalRow<any>("games", gameId);
  const allMyPlayers = useLocalRows<any>("game_players", gameId && user ? { game_id: gameId, user_id: user.id } : undefined);
  const myPlayer = allMyPlayers.length > 0 ? allMyPlayers[0] : null;
  const myCharacters = useLocalRows<any>("characters", user ? { user_id: user.id } : undefined);
  const sortedCharacters = useMemo(() =>
    [...myCharacters].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [myCharacters]
  );

  const selectedCharacter = useMemo(
    () => myCharacters.find((c) => c.id === myPlayer?.character_id) ?? null,
    [myCharacters, myPlayer]
  );

  const selectCharacter = (characterId: string) => {
    if (!myPlayer) return;
    upsertRow("game_players", { ...myPlayer, character_id: characterId });
    triggerPush();
    toast({ title: t("game.characterSelected") });
  };
  const currentSectionId = game?.current_section ?? null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effectiveScenario = useMemo(() => game ? getScenarioById(game.scenario_id) : null, [game?.scenario_id, scenarioReady]);

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => { pullTable("games", { id: gameId }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);
  const scenarioContent = effectiveScenario?.content || "";
  const parsed = useMemo(() => parseWikitext(scenarioContent), [scenarioContent]);

  useEffect(() => {
    const urls = extractImageUrls(scenarioContent);
    if (urls.length > 0) { for (const url of urls) { const img = new Image(); img.src = url; } }
  }, [scenarioContent]);

  /** Walk the tree to find a section and collect ancestor background along the way. */
  const findSectionWithBg = useMemo(() => {
    function walk(sections: WikiSection[], id: string, parentBg: string | null): { section: WikiSection; bg: string | null } | null {
      for (const s of sections) {
        const effectiveBg = resolveBackgroundImage(s, parentBg);
        if (s.id === id) return { section: s, bg: effectiveBg };
        const found = walk(s.children, id, effectiveBg);
        if (found) return found;
      }
      return null;
    }
    if (!currentSectionId) return null;
    return walk(parsed.sections, currentSectionId, parsed.metadata.background_image || null);
  }, [parsed, currentSectionId]);

  const activeSection = findSectionWithBg?.section ?? null;
  const activeBg = findSectionWithBg?.bg ?? null;

  const sectionTitle = activeSection?.title
    ?? (currentSectionId
      ? currentSectionId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
      : null);

  if (!game) return <FullPageLoader message={t("game.joiningQuest")} />;

  const copyCode = () => {
    if (game?.join_code) {
      navigator.clipboard.writeText(game.join_code);
      toast({ title: t("game.copied") });
    }
  };

  if (game.status === "ended") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">{t("game.questEnded")}</p>
        <Button onClick={() => navigate("/")} variant="outline">{t("game.returnHome")}</Button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col transition-[background-image] duration-700"
      style={activeBg ? {
        backgroundImage: `linear-gradient(to bottom, hsl(var(--background) / 0.3), hsl(var(--background) / 0.5)), url(${activeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : undefined}
    >
      <PageHeader
        title={effectiveScenario?.title ?? ""}
        leftAction={<Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>}
        rightActions={
          game?.join_code ? (
            <Button variant="outline" size="sm" onClick={copyCode} className="font-mono text-xs gap-1.5">
              {game.join_code} <Copy className="h-3.5 w-3.5" />
            </Button>
          ) : undefined
        }
        badge={!online ? <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{t("game.offline")}</span> : undefined}
      />

      <main className={`flex-1 container py-8 flex items-center justify-center max-w-3xl ${isGuest ? "pb-32" : "pb-24"}`}>
        {!currentSectionId && (
          <div className="text-center space-y-4">
            <div className="animate-pulse-glow text-primary font-display text-xl">
              {online ? t("game.waitingGM") : t("game.offlineLastState")}
            </div>
            <p className="text-muted-foreground text-sm">
              {online ? t("game.questBegin") : t("game.realtimeResume")}
            </p>
            <div className="ornamental-divider w-32 mx-auto" />
          </div>
        )}
      </main>

      {!window.matchMedia('(display-mode: standalone)').matches && (
        <p className="text-center py-4">
          <Link to="/install" className="text-xs text-muted-foreground/50 hover:text-primary transition-colors font-display">
            {t("dashboard.installApp")}
          </Link>
        </p>
      )}

      <DiceRoller gameId={gameId} userName={selectedCharacter?.name ?? t("game.aPlayer")} isGameMaster={false} />

      {!sheetExpanded && (
        <div
          className={`fixed inset-x-0 z-40 bg-card border-t border-primary/10 backdrop-blur cursor-pointer gold-glow-box ${isGuest ? "bottom-10" : "bottom-0"}`}
          onClick={() => setSheetExpanded(true)}
        >
          <div className="container max-w-3xl py-2 px-4">
            <div className="flex items-center gap-3">
              <GripHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              {selectedCharacter ? (
                <div className="flex-1 min-w-0"><CharacterListItem character={selectedCharacter} /></div>
              ) : (
                <span className="font-display text-sm font-medium text-muted-foreground">{t("game.selectCharacter")}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {sheetExpanded && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300 pt-[env(safe-area-inset-top)]">
          <div className="border-b border-border/50 bg-card/80 backdrop-blur">
            <div className="container max-w-2xl flex items-center justify-between py-3 px-4">
              <span className="font-display text-sm font-medium text-foreground">{t("game.yourCharacters")}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSheetExpanded(false)}><X className="h-4 w-4" /></Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="container max-w-2xl py-6 px-4 space-y-3">
              {sortedCharacters.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t("game.noCharactersYet")}</p>
                  <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setCreatingChar(true)}>
                    <Plus className="h-3 w-3" /> {t("game.newCharacter")}
                  </Button>
                </div>
              ) : (
                <>
                  {sortedCharacters.map((char) => (
                    <div
                      key={char.id}
                      onClick={() => selectCharacter(char.id)}
                      className={`cursor-pointer rounded-lg transition-colors ${char.id === myPlayer?.character_id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"}`}
                    >
                      <CharacterListItem
                        character={char}
                        actions={
                          <div className="flex items-center gap-1">
                            {char.id === myPlayer?.character_id && <Check className="h-4 w-4 text-primary" />}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingCharId(char.id); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setCreatingChar(true)}>
                    <Plus className="h-3 w-3" /> {t("game.newCharacter")}
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {creatingChar && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200 pt-[env(safe-area-inset-top)]">
          <div className="border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0">
            <span className="font-display text-sm font-medium text-foreground">{t("dashboard.createCharacter")}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCreatingChar(false)}><X className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="container max-w-2xl py-6 px-4">
              <CharacterCreationWizard gameId={gameId} onCreated={(id) => { selectCharacter(id); setCreatingChar(false); }} onCancel={() => setCreatingChar(false)} />
            </div>
          </ScrollArea>
        </div>
      )}

      {editingCharId && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200 pt-[env(safe-area-inset-top)]">
          <div className="border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0">
            <span className="font-display text-sm font-medium text-foreground">{t("dashboard.editCharacter")}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCharId(null)}><X className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="container max-w-2xl py-6 px-4">
              <CharacterSheet characterId={editingCharId} mode="player" scenarioLevel={(effectiveScenario as any)?.level ?? undefined} onDone={() => setEditingCharId(null)} />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default PlayGame;
