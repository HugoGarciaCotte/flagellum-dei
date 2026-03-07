import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Copy, Crown, Users, StopCircle } from "lucide-react";
import { getCachedSections, isOffline } from "@/lib/offlineStorage";

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
        .select("*, scenarios(title, description)")
        .eq("id", gameId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
  });

  const { data: sections } = useQuery({
    queryKey: ["sections", game?.scenario_id],
    queryFn: async () => {
      if (isOffline()) {
        const cached = getCachedSections(game!.scenario_id);
        if (cached && cached.length > 0) return cached;
      }
      const { data, error } = await supabase
        .from("scenario_sections")
        .select("*")
        .eq("scenario_id", game!.scenario_id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!game?.scenario_id,
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

  const currentSectionIndex = sections?.findIndex((s) => s.id === game?.current_section_id) ?? -1;
  const currentSection = currentSectionIndex >= 0 ? sections![currentSectionIndex] : null;

  const navigateSection = async (direction: "next" | "prev") => {
    if (!sections || !game) return;
    let newIndex = direction === "next"
      ? Math.min(currentSectionIndex + 1, sections.length - 1)
      : Math.max(currentSectionIndex - 1, 0);
    if (currentSectionIndex === -1 && direction === "next") newIndex = 0;

    const { error } = await supabase
      .from("games")
      .update({ current_section_id: sections[newIndex].id })
      .eq("id", game.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ["game", gameId] });
  };

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

  if (!game || !sections) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse-glow text-primary font-display text-xl">Loading quest...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
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

      {/* Section display */}
      <main className="flex-1 container py-8 flex flex-col items-center justify-center max-w-3xl">
        {currentSection ? (
          <Card
            className="w-full border-2 transition-all duration-500"
            style={{ borderColor: currentSection.background_color }}
          >
            <CardContent className="p-8 space-y-4">
              <h2 className="font-display text-2xl font-bold" style={{ color: currentSection.background_color }}>
                {currentSection.title}
              </h2>
              <div className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {currentSection.content}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground font-display text-xl">Ready to begin the quest?</p>
            <p className="text-sm text-muted-foreground">Share the join code with players, then advance to the first section.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => navigateSection("prev")}
            disabled={currentSectionIndex <= 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-muted-foreground text-sm font-display">
            {currentSectionIndex >= 0 ? `${currentSectionIndex + 1} / ${sections.length}` : `0 / ${sections.length}`}
          </span>
          <Button
            onClick={() => navigateSection("next")}
            disabled={currentSectionIndex >= sections.length - 1}
            className="gap-2"
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default HostGame;
