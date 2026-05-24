## Plan

Fix the GM player sheet showing player names with empty character slots, and make sure the GM view stays in sync when players edit their own data.

### Root cause

The host page relies on local cache for `characters` and `profiles`. On page load it does not always pull every joined player's characters, so players appear without any character info ("No character selected"). The existing realtime subscription only refreshes on `game_players` changes plus `characters` INSERT/UPDATE — but if the initial pull missed them, the cache stays empty until someone re-joins.

### Fix

1. **Pull every player's data on host load and when the player list changes**
   - In `HostGame.tsx`, when `syncReady` + `online` + `gameId` + `allPlayers` are ready, pull:
     - `profiles` for each player `user_id`
     - `characters` for each player `user_id`
     - the specific `character_id` row when set
   - Re-run when `allPlayers` changes (new joiner, character link change).

2. **Live refresh when a player edits their character or profile**
   - The current realtime subscription on `characters` already exists, but verify it actually triggers a re-pull for the changed `user_id` and that `profiles` updates are also subscribed.
   - Add a `profiles` realtime subscription scoped to the player `user_id`s so display name changes appear immediately on the GM side.
   - Ensure the `characters` subscription does not silently drop events for players who joined after the host opened the page (refresh the player-id set when `allPlayers` changes).

3. **Display safeguard in `PlayerListSheet` / `GMPlayerList`**
   - If a player has a `character_id` but the row isn't in local cache yet, show a "loading…" state instead of "No character selected" to avoid false empties.

4. **No schema or RLS changes.** Pure client sync + display fix.