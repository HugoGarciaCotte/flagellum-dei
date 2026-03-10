import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getScenarioById } from "@/data/scenarios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { triggerPush, pullAll } from "@/lib/syncManager";

const PlayGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const online = useNetworkStatus();

  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [creatingChar, setCreatingChar] = useState(false);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);

  // Local-first data
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
    toast({ title: "Character selected!" });
  };

  const effectiveScenario = game ? getScenarioById(game.scenario_id) : null;

  // Realtime: listen for game updates
  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => {
        pullAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  const currentSectionId = game?.current_section ?? null;

  const sectionTitle = currentSectionId
    ? currentSectionId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;

  if (!game) {
    return <FullPageLoader message="Joining quest..." />;
  }

  const copyCode = () => {
    if (game?.join_code) {
      navigator.clipboard.writeText(game.join_code);
      toast({ title: "Join code copied!" });
    }
  };

  if (game.status === "ended") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">This quest has ended.</p>
        <Button onClick={() => navigate("/")} variant="outline">Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader
        title={effectiveScenario?.title ?? ""}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
        rightActions={
          game?.join_code ? (
            <Button variant="outline" size="sm" onClick={copyCode} className="font-mono text-xs gap-1.5">
              {game.join_code}
              <Copy className="h-3.5 w-3.5" />
            </Button>
          ) : undefined
        }
        badge={
          !online ? (
            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Offline</span>
          ) : undefined
        }
      />

      {/* Quest content — always visible */}
      <main className={`flex-1 container py-8 flex items-center justify-center max-w-3xl ${isGuest ? "pb-32" : "pb-24"}`}>
        {sectionTitle ? (
          <Card className="w-full aged-border">
            <CardContent className="p-8 text-center">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {sectionTitle}
              </h2>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center space-y-4">
            <div className="animate-pulse-glow text-primary font-display text-xl">
              {online ? "Waiting for the Game Master..." : "Offline — showing last known state"}
            </div>
            <p className="text-muted-foreground text-sm">
              {online ? "The quest will begin shortly." : "Realtime updates will resume when back online."}
            </p>
            <div className="ornamental-divider w-32 mx-auto" />
          </div>
        )}
      </main>

      {!window.matchMedia('(display-mode: standalone)').matches && (
        <p className="text-center py-4">
          <Link to="/install" className="text-xs text-muted-foreground/50 hover:text-primary transition-colors font-display">
            Install as app →
          </Link>
        </p>
      )}

      {/* Dice roller FAB */}
      <DiceRoller
        gameId={gameId}
        userName={selectedCharacter?.name ?? "A player"}
        isGameMaster={false}
      />

      {/* Bottom character peek bar */}
      {!sheetExpanded && (
        <div
          className={`fixed inset-x-0 z-40 bg-card border-t border-primary/10 backdrop-blur cursor-pointer gold-glow-box ${isGuest ? "bottom-10" : "bottom-0"}`}
          onClick={() => setSheetExpanded(true)}
        >
          <div className="container max-w-3xl py-2 px-4">
            <div className="flex items-center gap-3">
              <GripHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              {selectedCharacter ? (
                <div className="flex-1 min-w-0">
                  <CharacterListItem character={selectedCharacter} />
                </div>
              ) : (
                <span className="font-display text-sm font-medium text-muted-foreground">
                  Select a character
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded character overlay */}
      {sheetExpanded && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300 pt-[env(safe-area-inset-top)]">
          <div className="border-b border-border/50 bg-card/80 backdrop-blur">
            <div className="container max-w-2xl flex items-center justify-between py-3 px-4">
              <span className="font-display text-sm font-medium text-foreground">Your Characters</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSheetExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="container max-w-2xl py-6 px-4 space-y-3">
              {sortedCharacters.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No characters yet.</p>
                  <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setCreatingChar(true)}>
                    <Plus className="h-3 w-3" /> New Character
                  </Button>
                </div>
              ) : (
                <>
                  {sortedCharacters.map((char) => (
                    <div
                      key={char.id}
                      onClick={() => selectCharacter(char.id)}
                      className={`cursor-pointer rounded-lg transition-colors ${
                        char.id === myPlayer?.character_id
                          ? "ring-2 ring-primary"
                          : "hover:ring-1 hover:ring-primary/50"
                      }`}
                    >
                      <CharacterListItem
                        character={char}
                        actions={
                          <div className="flex items-center gap-1">
                            {char.id === myPlayer?.character_id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCharId(char.id);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setCreatingChar(true)}>
                    <Plus className="h-3 w-3" /> New Character
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Fullscreen Create Character */}
      {creatingChar && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200 pt-[env(safe-area-inset-top)]">
          <div className="border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0">
            <span className="font-display text-sm font-medium text-foreground">Create Character</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCreatingChar(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="container max-w-2xl py-6 px-4">
              <CharacterCreationWizard
                gameId={gameId}
                onCreated={(id) => {
                  selectCharacter(id);
                  setCreatingChar(false);
                }}
                onCancel={() => setCreatingChar(false)}
              />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Fullscreen Edit Character */}
      {editingCharId && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
          <div className="border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0">
            <span className="font-display text-sm font-medium text-foreground">Edit Character</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCharId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="container max-w-2xl py-6 px-4">
              <CharacterSheet
                characterId={editingCharId}
                mode="player"
                scenarioLevel={(effectiveScenario as any)?.level ?? undefined}
                onDone={() => setEditingCharId(null)}
              />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default PlayGame;
