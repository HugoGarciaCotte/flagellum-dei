

## Fix: HostGame stuck on "Loading Quest" — use `syncReady` gate + targeted pull

### Root cause

`HostGame` reads `useLocalRow("games", gameId)` immediately on mount. But the initial `pullAll()` in `AuthContext` is asynchronous — until it completes, the local store is empty (or stale). The component sees `game === undefined` and shows `FullPageLoader` forever because there's no mechanism to wait for sync completion or retry.

The same issue affects `PlayGame`.

### Elegant fix

The `AuthContext` already exposes a `syncReady` boolean that becomes `true` after the initial `pullAll` completes. The page components just don't use it.

**Strategy**: Gate the loading state on `syncReady`. Before sync is ready, show the loader (expected). After sync completes, if the game is still missing from local store, do a single targeted `pullTable("games", { id: gameId })` — this handles edge cases where the game wasn't included in the scoped `pullAll` (e.g., navigating directly via URL to a game not yet in local cache).

### Changes

**`src/pages/HostGame.tsx`**
1. Destructure `syncReady` from `useAuth()`
2. Add a `useEffect` that runs when `syncReady` is `true` and `game` is still `undefined` — calls `pullTable("games", { id: gameId })` and also pulls `game_players` for that game
3. Update the loader condition: show loader when `!syncReady || !game` (same visual, but now the targeted pull will resolve it)

**`src/pages/PlayGame.tsx`**
Same pattern — add `syncReady` gate and targeted `pullTable` fallback.

### Why this is better than the previous proposal
- Uses existing infrastructure (`syncReady`, `pullTable`) instead of raw Supabase queries
- `pullTable` merges into localStore, which triggers the reactive hooks automatically
- No direct `supabase.from()` calls in page components for data loading — stays consistent with the local-first architecture
- Fixes the issue for both host and player pages

| File | Change |
|------|--------|
| `src/pages/HostGame.tsx` | Use `syncReady` + targeted `pullTable` fallback |
| `src/pages/PlayGame.tsx` | Same pattern |

