## Goal

"My Players" should list **every player who ever joined any game I hosted** (active or ended), filtered to those who currently have at least one character.

## Current behavior

- `doPull` in `syncManager.ts` filters games with `.neq("status", "ended")`, so ended games + their `game_players` rows are never pulled.
- `GMPlayerList` reads `useLocalRows("games", { host_user_id })` and intersects with `game_players` to build the player list. With no ended games in local store, ex-players disappear.

## Plan

### 1. Sync layer (`src/lib/syncManager.ts`)

Pull all hosted games regardless of status, but keep the existing scope for games where the user is just a player (still skip ended ones to avoid bloating local store):

- Change the `gamesQuery` `or(...)` clause to:
  - host branch: `host_user_id.eq.{userId}` (no status filter)
  - player branch: keep `id.in.(...)` AND status != ended (apply after fetch, or split into two queries)
- Simplest implementation: run two parallel queries
  - `supabase.from("games").select("*").eq("host_user_id", userId)` — all my hosted games
  - `supabase.from("games").select("*").neq("status", "ended").in("id", playerGameIds)` — only active games where I'm a player
  - merge results

- Phase 3 `game_players` pull: already uses `activeGameIds` which now includes ended hosted games — good, no change beyond the new game set.
- Phase 4 character pull for other users: already does full-pull for non-self users — good, will pick up ex-players' characters.

- Update `evictStaleGames()` if it would now evict ended hosted games (need to verify) — exempt games where I'm the host.

### 2. Component (`src/components/GMPlayerList.tsx`)

- The `games` list (`useLocalRows("games", { host_user_id: user?.id })`) will now include ended games — no code change needed there.
- The `players` `useMemo` already filters out players with no characters via `chars[0] ?? null` + `otherChars`, but currently still **includes** players with zero characters as entries with `currentChar: null` and empty `otherChars`. Add an explicit filter: skip any player where `chars.length === 0`.
- "Current" character logic: for ex-players from ended games, `gp.character_id` may be stale or null. Keep the existing "most recently updated character" heuristic — it already works without `game_players.character_id`.

### 3. Realtime

- Subscription already listens for `*` on `characters`, `profiles`, `game_players` and re-pulls when a relevant `user_id` changes. No change needed — ex-players' edits will still flow through.

## Files

- `src/lib/syncManager.ts` — split hosted-vs-played game queries; lift `neq("status","ended")` for hosted games.
- `src/components/GMPlayerList.tsx` — drop players with zero characters from the rendered list.

## Out of scope

- Pagination / quota: hosted-game count is small per user; not a concern now. If it grows, can add a 6-month cutoff later.
- No DB migration needed.
