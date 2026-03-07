import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Scroll, User, Plus, Check } from "lucide-react";
import CharacterSheet from "@/components/CharacterSheet";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getCachedGameSession } from "@/lib/offlineStorage";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import DiceRoller from "@/components/DiceRoller";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";
import CreateCharacterForm from "@/components/CreateCharacterForm";

const PlayGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useNetworkStatus();

  const [creatingChar, setCreatingChar] = useState(false);

  // Fetch game WITHOUT scenario content — only title
  const { data: game, error: gameError } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*, scenarios(title, level)")
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
  const effectiveScenario = game ? (game as any).scenarios : cachedSession?.scenario;

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

  // Format section title from slug
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
        icon={<Scroll className="h-4 w-4 text-primary" />}
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
        rightActions={
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-3 w-3" />
                {selectedCharacter ? selectedCharacter.name : "Character"}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Your Character</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {selectedCharacter && (
                  <CharacterSheet
                    characterId={selectedCharacter.id}
                    mode="player"
                    scenarioLevel={effectiveScenario?.level ?? undefined}
                  />
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Your characters</p>
                  {(myCharacters ?? []).length === 0 && !creatingChar && (
                    <p className="text-sm text-muted-foreground">No characters yet. Create one below.</p>
                  )}
                  <div className="space-y-2">
                    {(myCharacters ?? []).map((char) => (
                      <button
                        key={char.id}
                        onClick={() => selectCharMutation.mutate(char.id)}
                        className={`w-full text-left p-3 rounded-md border transition-colors ${
                          char.id === myPlayer?.character_id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground text-sm">{char.name}</span>
                          {char.id === myPlayer?.character_id && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        {char.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{char.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {creatingChar ? (
                  <div className="border border-border rounded-md p-3">
                    <CreateCharacterForm
                      submitLabel="Create & Select"
                      onCreated={(id) => {
                        selectCharMutation.mutate(id);
                        setCreatingChar(false);
                      }}
                      onCancel={() => setCreatingChar(false)}
                    />
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setCreatingChar(true)}>
                    <Plus className="h-3 w-3" /> New Character
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      <main className="flex-1 container py-8 flex items-center justify-center max-w-3xl">
        {sectionTitle ? (
          <Card className="w-full border-primary/20">
            <CardContent className="p-8 text-center">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {sectionTitle}
              </h2>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center space-y-2">
            <div className="animate-pulse-glow text-primary font-display text-xl">
              {online ? "Waiting for the Game Master..." : "Offline — showing last known state"}
            </div>
            <p className="text-muted-foreground text-sm">
              {online ? "The quest will begin shortly." : "Realtime updates will resume when back online."}
            </p>
          </div>
        )}
      </main>

      <DiceRoller />
    </div>
  );
};

export default PlayGame;
