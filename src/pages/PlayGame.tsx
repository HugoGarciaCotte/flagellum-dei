import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getScenarioById } from "@/data/scenarios";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Check, X, GripHorizontal, Pencil } from "lucide-react";
import CharacterSheet from "@/components/CharacterSheet";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getCachedGameSession } from "@/lib/offlineStorage";
import { toast } from "@/hooks/use-toast";
import DiceRoller from "@/components/DiceRoller";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";
import CharacterCreationWizard from "@/components/CharacterCreationWizard";
import CharacterListItem from "@/components/CharacterListItem";
import { ScrollArea } from "@/components/ui/scroll-area";


const PlayGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useNetworkStatus();

  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [creatingChar, setCreatingChar] = useState(false);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);

  // Fetch game WITHOUT scenario content — only title
  const { data: game, error: gameError } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
    retry: online ? 3 : 0,
  });

  // Fetch current player's game_player row
  const { data: myPlayer } = useQuery({
    queryKey: ["my-game-player", gameId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_id", gameId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId && !!user,
  });

  // Fetch user's characters
  const { data: myCharacters } = useQuery({
    queryKey: ["my-characters", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Selected character details
  const selectedCharacter = useMemo(
    () => (myCharacters ?? []).find((c) => c.id === myPlayer?.character_id) ?? null,
    [myCharacters, myPlayer]
  );

  // Select character mutation
  const selectCharMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const { error } = await supabase
        .from("game_players")
        .update({ character_id: characterId })
        .eq("game_id", gameId!)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-game-player", gameId, user?.id] });
      toast({ title: "Character selected!" });
    },
  });

  // Offline fallback
  const cachedSession = useMemo(() => {
    if (game) return null;
    if (!gameId) return null;
    return getCachedGameSession(gameId);
  }, [game, gameId, gameError]);

  const effectiveGame = game ?? cachedSession?.game;
  const effectiveScenario = game
    ? getScenarioById(game.scenario_id)
    : cachedSession?.scenario;

  // Realtime: listen for game updates
  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId, queryClient]);

  const currentSectionId = (effectiveGame as any)?.current_section ?? null;

  const sectionTitle = currentSectionId
    ? currentSectionId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;

  if (!effectiveGame) {
    return <FullPageLoader message="Joining quest..." />;
  }

  if ((effectiveGame as any).status === "ended") {
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
        icon={<span className="text-base text-primary" aria-hidden="true">🜣</span>}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
        badge={
          !online ? (
            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Offline</span>
          ) : undefined
        }
      />

      {/* Quest content — always visible */}
      <main className="flex-1 container py-8 pb-24 flex items-center justify-center max-w-3xl">
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

      {/* Dice roller FAB */}
      <DiceRoller />

      {/* Bottom character peek bar */}
      {!sheetExpanded && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-primary/10 backdrop-blur cursor-pointer gold-glow-box"
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
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Header bar */}
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

          {/* Scrollable content */}
          <ScrollArea className="flex-1">
            <div className="container max-w-2xl py-6 px-4 space-y-3">
              {(myCharacters ?? []).length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No characters yet.</p>
                  <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setCreatingChar(true)}>
                    <Plus className="h-3 w-3" /> New Character
                  </Button>
                </div>
              ) : (
                <>
                  {(myCharacters ?? []).map((char) => (
                    <div
                      key={char.id}
                      onClick={() => selectCharMutation.mutate(char.id)}
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
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
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
                  selectCharMutation.mutate(id);
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
                onDone={() => {
                  setEditingCharId(null);
                  queryClient.invalidateQueries({ queryKey: ["my-characters"] });
                }}
              />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default PlayGame;
