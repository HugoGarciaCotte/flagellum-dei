import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Scroll } from "lucide-react";

const PlayGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: game } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*, scenarios(title)")
        .eq("id", gameId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
  });

  const { data: section } = useQuery({
    queryKey: ["current-section", game?.current_section_id],
    queryFn: async () => {
      if (!game?.current_section_id) return null;
      const { data, error } = await supabase
        .from("scenario_sections")
        .select("*")
        .eq("id", game.current_section_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!game?.current_section_id,
  });

  // Realtime: listen for game updates (section changes)
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

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse-glow text-primary font-display text-xl">Joining quest...</div>
      </div>
    );
  }

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
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center h-14 gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Scroll className="h-4 w-4 text-primary" />
            {(game as any).scenarios?.title}
          </h1>
        </div>
      </header>

      <main className="flex-1 container py-8 flex items-center justify-center max-w-3xl">
        {section ? (
          <Card
            className="w-full border-2 transition-all duration-700"
            style={{ borderColor: section.background_color }}
          >
            <CardContent className="p-8 space-y-4">
              <h2 className="font-display text-2xl font-bold" style={{ color: section.background_color }}>
                {section.title}
              </h2>
              <div className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center space-y-2">
            <div className="animate-pulse-glow text-primary font-display text-xl">
              Waiting for the Game Master...
            </div>
            <p className="text-muted-foreground text-sm">The quest will begin shortly.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlayGame;
