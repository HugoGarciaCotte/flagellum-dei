

## Bug: GM doesn't see player's characters

### Root cause

In `HostGame.tsx`, the realtime subscription for `game_players` (line 92-96) only pulls the `game_players` table when changes occur. It does **not** pull the player's **characters**. Characters for other players are only fetched during the initial `pullAll()` sync. So if a player joins after the GM has already loaded, or selects a character, the GM never fetches that player's character data.

### Fix

In `HostGame.tsx`, when the `game_players` realtime subscription fires, also pull the characters for all player user IDs. After pulling `game_players`, read the updated player list from local store, collect their user IDs, and pull their characters and profiles.

**`src/pages/HostGame.tsx`** (lines 90-96) — update the realtime callback:

```typescript
useEffect(() => {
  if (!gameId) return;
  const channel = supabase.channel(`game-players-${gameId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, async () => {
      await pullTable("game_players", { game_id: gameId });
      // Also pull characters & profiles for all players in this game
      const updatedPlayers = store.getBy("game_players", { game_id: gameId });
      const uids = [...new Set(updatedPlayers.map((p: any) => p.user_id))];
      for (const uid of uids) {
        await pullTable("characters", { user_id: uid });
        await pullTable("profiles", { user_id: uid });
      }
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [gameId]);
```

Add `import * as store from "@/lib/localStore"` (or import `getBy` directly).

### Files to edit

| File | Change |
|------|--------|
| `src/pages/HostGame.tsx` | Pull characters + profiles for players on realtime game_players change |

