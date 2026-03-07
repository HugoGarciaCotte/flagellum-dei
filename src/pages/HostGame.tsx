import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Crown, Users, StopCircle } from "lucide-react";

const HostGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: game } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*, scenarios(title, description, content)")
        .eq("id", gameId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
  });

  const { data: players } = useQuery({
    queryKey: ["game-players", gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_players")
        .select("*, profiles:user_id(display_name)")
        .eq("game_id", gameId!);
      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
  });

  // Realtime for players joining
  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game-players-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["game-players", gameId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId, queryClient]);

  const endGame = async () => {
    if (!game) return;
    await supabase.from("games").update({ status: "ended" }).eq("id", game.id);
    navigate("/");
  };

  const copyCode = () => {
    if (game) {
      navigator.clipboard.writeText(game.join_code);
      toast({ title: "Copied!", description: "Join code copied to clipboard." });
    }
  };

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse-glow text-primary font-display text-xl">Loading quest...</div>
      </div>
    );
  }

  const scenarioContent = (game as any).scenarios?.content || "No content available.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              {(game as any).scenarios?.title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={copyCode} className="gap-2 border-primary/30 font-mono tracking-widest">
              <Copy className="h-3 w-3" /> {game.join_code}
            </Button>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Users className="h-4 w-4" /> {players?.length ?? 0}
            </div>
            <Button variant="destructive" size="sm" onClick={endGame} className="gap-1">
              <StopCircle className="h-3 w-3" /> End
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8 max-w-3xl">
        <Card className="w-full border-primary/20">
          <CardContent className="p-8">
            <div className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
              {scenarioContent}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HostGame;
