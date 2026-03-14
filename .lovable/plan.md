

## Plan: Fix localStorage Quota — Scoped Pull + Ended Game Eviction

### Problem
`doPull()` fetches `SELECT *` on all 7 tables, storing everything in localStorage. With accumulated games and large data, this exceeds the ~5MB quota, causing `QuotaExceededError` and breaking page loads.

### Changes

**1. Scope `doPull` queries to current user** (`src/lib/syncManager.ts`)

- Accept `userId: string` parameter in `doPull` and `pullAll`
- Replace unfiltered selects with scoped queries:
  - `games` → `.or(`host_user_id.eq.${userId},id.in.(select game_id from game_players...)`)` — simplify by fetching active games only (`status.neq.ended`) plus games where user is host or player
  - `game_players` → filter by the game IDs fetched above
  - `characters` → user's own + characters of players in their active games
  - `character_feats` / `character_feat_subfeats` → for the fetched character IDs
  - `profiles` → only profiles of relevant users
  - `user_roles` → only current user's roles
- Since RLS already filters most data server-side, the main win is not pulling `ended` games and their associated data

**2. Evict stale ended games on persist** (`src/lib/localStore.ts`)

- Add an `evictStaleGames()` function that removes games with `status === "ended"` and `updated_at` older than 24 hours from the local cache
- Also remove their associated `game_players` rows
- Call this in `persist()` or after `setTable("games", ...)`

**3. Pass userId from AuthContext** (`src/contexts/AuthContext.tsx`)

- Update `initSync` to call `pullAll(session.user.id)` instead of `pullAll()`

### Files modified
- `src/lib/syncManager.ts` — scoped queries, userId parameter
- `src/lib/localStore.ts` — stale game eviction
- `src/contexts/AuthContext.tsx` — pass user ID to pullAll

