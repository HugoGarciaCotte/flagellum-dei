import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Scroll } from "lucide-react";
import { parseWikitext, findSection } from "@/lib/parseWikitext";

const PlayGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: game } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*, scenarios(title, content)")
        .eq("id", gameId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gameId,
  });

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

  const scenarioContent = (game as any)?.scenarios?.content || "";
  const sections = useMemo(() => parseWikitext(scenarioContent), [scenarioContent]);
  const currentSectionId = (game as any)?.current_section ?? null;
  const activeSection = currentSectionId ? findSection(sections, currentSectionId) : null;

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
        {activeSection ? (
          <Card className="w-full border-primary/20">
            <CardContent className="p-8">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                {activeSection.title}
              </h2>
              <div
                className="text-foreground text-lg leading-relaxed prose prose-lg max-w-none
                  [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_hr]:my-3 [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: activeSection.content }}
              />
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
