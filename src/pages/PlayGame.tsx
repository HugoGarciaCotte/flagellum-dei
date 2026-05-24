import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getScenarioById } from "@/data/scenarios";
import { loadScenarioOverrides } from "@/lib/scenarioOverrides";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseWikitext, findSection, resolveBackgroundImage, extractImageUrls, WikiSection } from "@/lib/parseWikitext";
import { ArrowLeft, Plus, Check, X, ChevronUp, ChevronDown, Copy } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import CharacterDetailsDialog from "@/components/CharacterDetailsDialog";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { toast } from "@/hooks/use-toast";
import DiceRoller from "@/components/DiceRoller";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";
import CharacterCreationWizard from "@/components/CharacterCreationWizard";
import CharacterListItem from "@/components/CharacterListItem";
import PortraitViewer from "@/components/PortraitViewer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocalRow, useLocalRows } from "@/hooks/useLocalData";
import { upsertRow } from "@/lib/localStore";
import { triggerPush, pullTable } from "@/lib/syncManager";
import { useTranslation } from "@/i18n/useTranslation";
import { useBottomOffset } from "@/hooks/useBottomOffset";
// SpotifyPlayer removed — GM-only feature

const PlayGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, isGuest, syncReady } = useAuth();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { t, locale } = useTranslation();

  const [sheetExpanded, setSheetExpanded] = useState(false);
  const bottomOffset = useBottomOffset();
  const [creatingChar, setCreatingChar] = useState(false);
  const [viewingCharId, setViewingCharId] = useState<string | null>(null);
  const [scenarioReady, setScenarioReady] = useState(false);

  useEffect(() => {
    loadScenarioOverrides().then(() => setScenarioReady(true)).catch(() => setScenarioReady(true));
  }, []);

  const game = useLocalRow<any>("games", gameId);

  // Targeted pull if game missing after initial sync (e.g. direct URL navigation)
  useEffect(() => {
    if (!syncReady || game || !gameId || !online) return;
    pullTable("games", { id: gameId });
    pullTable("game_players", { game_id: gameId });
  }, [syncReady, game, gameId, online]);
  const allMyPlayers = useLocalRows<any>("game_players", gameId && user ? { game_id: gameId, user_id: user.id } : undefined);
  const myPlayer = allMyPlayers.length > 0 ? allMyPlayers[0] : null;
  const myCharacters = useLocalRows<any>("characters", user ? { user_id: user.id } : undefined);
  const sortedCharacters = useMemo(() =>
    [...myCharacters]
      .filter((c) => !c.deleted_at)
      .sort((a, b) => {
        const au = a.updated_at || a.created_at || "";
        const bu = b.updated_at || b.created_at || "";
        if (au !== bu) return bu.localeCompare(au);
        return (b.created_at || "").localeCompare(a.created_at || "");
      }),
    [myCharacters]
  );

  const currentCharacter = sortedCharacters[0] ?? null;
  const otherCharacters = sortedCharacters.slice(1);
  const selectedCharacter = currentCharacter;

  // Silently mirror the current character into game_players.character_id
  // so GM view, dice broadcasts, and history keep working — without any user action.
  useEffect(() => {
    if (!myPlayer || !currentCharacter) return;
    if (myPlayer.character_id === currentCharacter.id) return;
    upsertRow("game_players", { ...myPlayer, character_id: currentCharacter.id });
    triggerPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCharacter?.id, myPlayer?.id, myPlayer?.character_id]);
  const currentSectionId = game?.current_section ?? null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effectiveScenario = useMemo(() => game ? getScenarioById(game.scenario_id, locale) : null, [game?.scenario_id, scenarioReady, locale]);

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

  if (!syncReady || !game) return <FullPageLoader message={t("game.joiningQuest")} />;

  const copyCode = () => {
    if (game?.join_code) {
      navigator.clipboard.writeText(`${window.location.origin}/join/${game.join_code}`);
      toast({ title: t("game.copied"), description: t("game.joinLinkCopied") });
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
      className="fixed inset-0 bg-background flex flex-col transition-[background-image] duration-700"
      style={activeBg ? {
        backgroundImage: `url(${activeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : undefined}
    >
      <PageHeader
        title={effectiveScenario?.title ?? ""}
        leftAction={<Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>}
        rightActions={
          game?.join_code ? (
            <Button variant="outline" size="sm" onClick={copyCode} className="font-mono text-sm gap-1.5">
              <span className="font-sans font-medium tracking-normal">{t("game.joinCode")} :</span> {game.join_code} <Copy className="h-3.5 w-3.5" />
            </Button>
          ) : undefined
        }
        badge={!online ? <span className="text-sm bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{t("game.offline")}</span> : undefined}
      />

      <div className="flex-1 overflow-y-auto">
        <main className="container py-8 flex items-center justify-center max-w-3xl" style={{ paddingBottom: bottomOffset + 96 }}>
          {!currentSectionId && (
            <div className="text-center space-y-4">
              <div className="animate-pulse-glow text-primary font-display text-xl">
                {online ? t("game.waitingGM") : t("game.offlineLastState")}
              </div>
              <p className="text-muted-foreground text-base">
                {online ? t("game.questBegin") : t("game.realtimeResume")}
              </p>
              <div className="ornamental-divider w-32 mx-auto" />
            </div>
          )}
        </main>

      </div>

      {/* SpotifyPlayer removed — GM-only feature */}
      <DiceRoller gameId={gameId} userName={selectedCharacter?.name ?? t("game.aPlayer")} isGameMaster={false} />

      {!sheetExpanded && (
        <div
          className="fixed inset-x-0 z-40 bg-card border-t border-primary/10 backdrop-blur cursor-pointer gold-glow-box"
          style={{
            bottom: bottomOffset,
            paddingBottom: bottomOffset === 0 ? `env(safe-area-inset-bottom)` : undefined,
          }}
          onClick={() => setSheetExpanded(true)}
        >
          <div className="container max-w-3xl py-2 px-4">
            <div className="flex items-center gap-3">
              {selectedCharacter ? (
                <>
                  <PortraitViewer src={selectedCharacter.portrait_url} alt={selectedCharacter.name} fileName={selectedCharacter.name}>
                    <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                      {selectedCharacter.portrait_url ? (
                        <AvatarImage src={selectedCharacter.portrait_url} alt={selectedCharacter.name} />
                      ) : null}
                      <AvatarFallback className="text-xs font-display bg-muted">
                        {selectedCharacter.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </PortraitViewer>
                  <span className="flex-1 min-w-0 font-display text-base font-medium text-foreground truncate">
                    {selectedCharacter.name}
                  </span>
                </>
              ) : (
                <span className="flex-1 font-display text-base font-medium text-muted-foreground">{t("game.selectCharacter")}</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={t("game.yourCharacters")}
                onClick={(e) => { e.stopPropagation(); setSheetExpanded(true); }}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {sheetExpanded && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSheetExpanded(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-primary/20 rounded-t-xl flex flex-col animate-in slide-in-from-bottom duration-300 gold-glow-box"
            style={{ maxHeight: "min(70vh, 560px)" }}
          >
            <div className="border-b border-border/50 bg-card/80 backdrop-blur rounded-t-xl">
              <div className="container max-w-2xl flex items-center justify-between py-3 px-4">
                <span className="font-display text-base font-medium text-foreground">{t("game.yourCharacters")}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Collapse" onClick={() => setSheetExpanded(false)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close" onClick={() => setSheetExpanded(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="container max-w-2xl py-6 px-4 space-y-3" style={{ paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom))` }}>
                {sortedCharacters.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-base text-muted-foreground">{t("game.noCharactersYet")}</p>
                    <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setCreatingChar(true)}>
                      <Plus className="h-3 w-3" /> {t("game.newCharacter")}
                    </Button>
                  </div>
                ) : (
                  <>
                    {currentCharacter && (
                      <CharacterListItem
                        character={currentCharacter}
                        actions={
                          <span className="text-[10px] uppercase tracking-wider text-primary font-display">{t("common.current")}</span>
                        }
                      />
                    )}

                    {otherCharacters.length > 0 && (
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-display text-foreground bg-card/60 border border-border/60 rounded-md px-3 py-2 hover:bg-card transition-colors cursor-pointer group w-full">
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                          <span className="flex-1 text-left">{t("dashboard.otherCharacters").replace("{count}", String(otherCharacters.length))}</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2">
                          {otherCharacters.map((char) => (
                            <CharacterListItem
                              key={char.id}
                              character={char}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setCreatingChar(true)}>
                      <Plus className="h-3 w-3" /> {t("game.newCharacter")}
                    </Button>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}


      {creatingChar && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200 pt-[env(safe-area-inset-top)]">
          <div className="border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0">
            <span className="font-display text-base font-medium text-foreground">{t("dashboard.createCharacter")}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCreatingChar(false)}><X className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="container max-w-2xl py-6 px-4">
              <CharacterCreationWizard gameId={gameId} onCreated={() => { setCreatingChar(false); }} onCancel={() => setCreatingChar(false)} />
            </div>
          </ScrollArea>
        </div>
      )}

      <CharacterDetailsDialog
        characterId={viewingCharId}
        open={!!viewingCharId}
        onOpenChange={(o) => { if (!o) setViewingCharId(null); }}
        canEdit
        canDelete={false}
        editMode="player"
        scenarioLevel={(effectiveScenario as any)?.level ?? undefined}
      />
    </div>
  );
};

export default PlayGame;
