import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, StopCircle } from "lucide-react";

import PlayerListSheet from "@/components/PlayerListSheet";
import { parseWikitext, extractImageUrls } from "@/lib/parseWikitext";
import WikiSectionTree from "@/components/WikiSectionTree";
import DiceRoller from "@/components/DiceRoller";
import GameTimer from "@/components/GameTimer";
import { useOfflineGameSession } from "@/hooks/useOfflineGameSession";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getCachedGameSession, updateCachedSection, prefetchImages } from "@/lib/offlineStorage";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";

const HostGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useNetworkStatus();

  // Local override for current_section when offline
  const [localSection, setLocalSection] = useState<string | null>(null);

  const { data: game, error: gameError } = useQuery({
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
    retry: online ? 3 : 0,
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
    retry: online ? 3 : 0,
  });

  // Fetch ALL characters for all players (not just selected ones)
  const playerUserIds = useMemo(
    () => [...new Set((players ?? []).map((p: any) => p.user_id))],
    [players]
  );

  const { data: characters } = useQuery({
    queryKey: ["game-characters", gameId, playerUserIds],
    queryFn: async () => {
      if (playerUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from("characters")
        .select("id, name, description, user_id")
        .in("user_id", playerUserIds);
      if (error) throw error;
      return data;
    },
    enabled: !!gameId && playerUserIds.length > 0,
    retry: online ? 3 : 0,
  });

  // Cache session for offline use
  useOfflineGameSession({ gameId, game, players, characters });

  // Offline fallback data
  const cachedSession = useMemo(() => {
    if (game) return null; // online data available
    if (!gameId) return null;
    return getCachedGameSession(gameId);
  }, [game, gameId, gameError]);

  const effectiveGame = game ?? cachedSession?.game;
  const effectiveScenario = game ? (game as any).scenarios : cachedSession?.scenario;
  const effectivePlayers = players ?? cachedSession?.players ?? [];

  // Prefetch scenario images
  const scenarioContent = effectiveScenario?.content || "";
  const parsed = useMemo(() => parseWikitext(scenarioContent), [scenarioContent]);
  const sections = parsed.sections;
  const scenarioMeta = parsed.metadata;

  useEffect(() => {
    const urls = extractImageUrls(scenarioContent);
    if (urls.length > 0) prefetchImages(urls);
  }, [scenarioContent]);

  const activeSection = localSection ?? (effectiveGame as any)?.current_section ?? null;

  // Sync localSection when online data arrives
  useEffect(() => {
    if (game) {
      setLocalSection(null);
    }
  }, [game]);

  // Realtime for game updates
  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game-host-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId, queryClient]);

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
    if (!effectiveGame) return;
    if (!online) {
      toast({ title: "Offline", description: "Cannot end the game while offline.", variant: "destructive" });
      return;
    }
    await supabase.from("games").update({ status: "ended" }).eq("id", (effectiveGame as any).id);
    navigate("/");
  };

  const copyCode = () => {
    if (effectiveGame) {
      navigator.clipboard.writeText((effectiveGame as any).join_code);
      toast({ title: "Copied!", description: "Join code copied to clipboard." });
    }
  };

  const activateSection = async (sectionId: string) => {
    // Always update local state + cache immediately
    setLocalSection(sectionId);
    if (gameId) updateCachedSection(gameId, sectionId);

    if (!effectiveGame) return;

    if (online) {
      await supabase.from("games").update({ current_section: sectionId } as any).eq("id", (effectiveGame as any).id);
    }
  };

  if (!effectiveGame) {
    return <FullPageLoader message="Loading quest..." />;
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
        badge={
          <>
            {scenarioMeta.scenario_level && (
              <span className="text-xs font-normal bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                Lv. {scenarioMeta.scenario_level}
              </span>
            )}
            {!online && (
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Offline</span>
            )}
          </>
        }
        rightActions={
          <>
            <Button variant="outline" size="sm" onClick={copyCode} className="gap-2 border-primary/30 font-mono tracking-widest">
              <Copy className="h-3 w-3" /> {(effectiveGame as any).join_code}
            </Button>
            <PlayerListSheet
              players={effectivePlayers}
              characters={characters ?? []}
              gameId={gameId!}
            />
            <Button variant="destructive" size="sm" onClick={endGame} className="gap-1">
              <StopCircle className="h-3 w-3" /> End
            </Button>
          </>
        }
      />

      <main className="flex-1 container py-6 max-w-5xl">
        {sections.length > 0 ? (
          <Card className="w-full aged-border gold-glow-box">
            <CardContent className="p-4">
              <WikiSectionTree
                sections={sections}
                activeSection={activeSection}
                onActivateSection={activateSection}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full border-primary/20">
            <CardContent className="p-8">
              <div className="text-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {scenarioContent || "No content available."}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <GameTimer />
      <DiceRoller />
    </div>
  );
};

export default HostGame;
