

## Offline Feats Support

### Problem
Currently, feats (`all-feats` query) and character feats (`character-feats` query) are fetched from the database with no offline fallback. When offline, the `CharacterFeatPicker` shows nothing.

### Plan

**1. Add feats caching to `src/lib/offlineStorage.ts`**
- Add `FEATS_KEY = "qs_offline_feats"` constant
- Add `cacheFeats(feats)` and `getCachedFeats()` functions (same pattern as scenarios)
- Extend `CachedGameSession` to include a `characterFeats` array (keyed by character ID)
- Add `cacheCharacterFeats(characterId, feats)` and `getCachedCharacterFeats(characterId)` functions using key `qs_charfeats_{characterId}`

**2. Create `src/hooks/useOfflineFeats.ts`**
- Similar to `useOfflineScenarios` — prefetch all feats on Dashboard mount and cache them
- Call it from Dashboard alongside `useOfflineScenarios()`

**3. Update `CharacterFeatPicker` for offline fallback**
- For the `all-feats` query: add `initialData` or fallback logic — if the query fails/returns nothing and we're offline, use `getCachedFeats()`
- For the `character-feats` query: same pattern — fallback to `getCachedCharacterFeats(characterId)`
- Cache both datasets on every successful fetch (inside the query functions or via `useEffect`)
- When offline, hide the "Choose feat" / "Edit" / "Add free feat" buttons and the delete buttons (read-only mode)

**4. Update `useOfflineGameSession` to cache character feats**
- When caching a game session in `HostGame`, also fetch and cache each player's character feats so the GM has them offline

### Files changed
- `src/lib/offlineStorage.ts` — add feats + character feats caching functions
- `src/hooks/useOfflineFeats.ts` — new hook to prefetch all feats
- `src/pages/Dashboard.tsx` — call `useOfflineFeats()`
- `src/components/CharacterFeatPicker.tsx` — offline fallback for both queries, read-only when offline
- `src/hooks/useOfflineGameSession.ts` — cache character feats per player

