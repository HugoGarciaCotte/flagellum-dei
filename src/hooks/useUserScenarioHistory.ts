import { useMemo } from "react";
import { useLocalRows } from "@/hooks/useLocalData";

interface GamePlayerRow {
  user_id: string;
  game_id: string;
  joined_at: string;
  deleted_at?: string | null;
}

interface GameRow {
  id: string;
  scenario_id: string;
  deleted_at?: string | null;
}

/**
 * Returns the ordered list of distinct scenario_ids the given user has joined,
 * earliest first (based on earliest joined_at per scenario).
 * Returns [] when userId is undefined.
 */
export function useUserScenarioHistory(userId: string | undefined): string[] {
  const players = useLocalRows<GamePlayerRow>("game_players", userId ? { user_id: userId } : undefined);
  const games = useLocalRows<GameRow>("games");

  return useMemo(() => {
    if (!userId) return [];
    const gameById = new Map<string, GameRow>();
    for (const g of games) {
      if (!g.deleted_at) gameById.set(g.id, g);
    }
    const earliest = new Map<string, string>(); // scenario_id → earliest joined_at
    for (const p of players) {
      if (p.deleted_at) continue;
      const g = gameById.get(p.game_id);
      if (!g || !g.scenario_id) continue;
      const prev = earliest.get(g.scenario_id);
      if (!prev || p.joined_at < prev) earliest.set(g.scenario_id, p.joined_at);
    }
    return Array.from(earliest.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([sid]) => sid);
  }, [userId, players, games]);
}

/**
 * Returns the scenario_id of the user's most recently-joined non-deleted game,
 * or undefined when there is none.
 */
export function useCurrentScenarioId(userId: string | undefined): string | undefined {
  const players = useLocalRows<GamePlayerRow>("game_players", userId ? { user_id: userId } : undefined);
  const games = useLocalRows<GameRow>("games");
  return useMemo(() => {
    if (!userId) return undefined;
    const gameById = new Map<string, GameRow>();
    for (const g of games) if (!g.deleted_at) gameById.set(g.id, g);
    let best: { joined_at: string; scenario_id: string } | null = null;
    for (const p of players) {
      if (p.deleted_at) continue;
      const g = gameById.get(p.game_id);
      if (!g?.scenario_id) continue;
      if (!best || p.joined_at > best.joined_at) {
        best = { joined_at: p.joined_at, scenario_id: g.scenario_id };
      }
    }
    return best?.scenario_id;
  }, [userId, players, games]);
}
