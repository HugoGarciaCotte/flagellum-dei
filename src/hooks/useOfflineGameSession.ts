import { useEffect } from "react";
import {
  cacheGameSession,
  getCachedGameSession,
  CachedGameSession,
} from "@/lib/offlineStorage";

interface UseOfflineGameSessionOptions {
  gameId: string | undefined;
  game: any;
  players: any[] | undefined;
  characters: any[] | undefined;
}

/**
 * Caches game session data on every successful fetch.
 * Returns cached data for offline fallback.
 */
export function useOfflineGameSession({
  gameId,
  game,
  players,
  characters,
}: UseOfflineGameSessionOptions) {
  // Cache on every successful data change
  useEffect(() => {
    if (!gameId || !game) return;

    const scenario = (game as any).scenarios;
    if (!scenario) return;

    const session: CachedGameSession = {
      game: {
        id: game.id,
        status: game.status,
        join_code: game.join_code,
        current_section: game.current_section ?? null,
        host_user_id: game.host_user_id,
        scenario_id: game.scenario_id,
      },
      scenario: {
        title: scenario.title,
        description: scenario.description ?? null,
        content: scenario.content ?? null,
      },
      players: players ?? [],
      characters: characters ?? [],
      cachedAt: Date.now(),
    };

    cacheGameSession(gameId, session);
  }, [gameId, game, players, characters]);

  const getCached = (): CachedGameSession | null => {
    if (!gameId) return null;
    return getCachedGameSession(gameId);
  };

  return { getCached };
}
