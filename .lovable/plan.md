

## Complete the Local-First Migration

The previous step created the infrastructure (`localStore.ts`, `syncManager.ts`, `useLocalData.ts`) and updated small components, but left 6 major files still importing the old system (`useOfflineQuery`, `offlineQueue`, `useMutation`, `useQueryClient`). Meanwhile `App.tsx` already removed `QueryClientProvider`, so the app is currently broken.

### Files to update (6 rewrites)

**1. `src/pages/Dashboard.tsx`** (522 lines)
- Replace `useOfflineQuery` calls with `useLocalRows`
- Replace `useMutation`/`useQueryClient` with direct `localStore` writes + `triggerPush()`
- Replace `offlineQueue` imports with `localStore` + `syncManager`
- Remove `cacheGameSession` import (no longer needed)
- Character delete: `deleteRow("characters", id)` + `deleteBy("character_feats", {character_id: id})` + `triggerPush()`
- Game create: `upsertRow("games", {...})` + `triggerPush()`
- Join game: keep server call for lookup, then `upsertRow` the game + player locally, `triggerPush()`
- Become GM: `upsertRow("user_roles", {...})` + `triggerPush()`
- Edit character done callback: no-op (localStore events handle reactivity)

**2. `src/components/CharacterSheet.tsx`** (251 lines)
- Replace `useOfflineQuery` with `useLocalRow("characters", characterId)`
- Replace `useMutation` save with `upsertRow("characters", {...})` + `triggerPush()`
- Replace `queryClient.invalidateQueries` with nothing (localStore events propagate)
- Keep `supabase` import for portrait upload/generation (online-only features)
- After portrait upload/generation, also `upsertRow` the updated portrait_url

**3. `src/components/CharacterFeatPicker.tsx`** (935 lines)
- Replace `useOfflineQuery` calls with `useLocalRows("character_feats", {character_id})` and `useLocalRows("character_feat_subfeats")`
- Replace all 5 `useMutation` calls with plain async functions using `localStore` writes + `triggerPush()`
- Remove `online` guards on buttons — everything works offline now
- Keep `supabase` for AI validation only (graceful fallback on failure)
- Remove `offlineQueue` imports entirely

**4. `src/components/CharacterCreationWizard.tsx`** (892 lines)
- Replace `offlineQueue` imports with `localStore` + `syncManager`
- `saveArchetype`: `upsertRow("characters", {...})` + `upsertRow("character_feats", {...})` + `triggerPush()`
- `saveSubfeat`: `deleteBy` + `upsertRow` on `character_feat_subfeats` + `triggerPush()`
- `saveFinalDetails`: `upsertRow("characters", {...})` + `triggerPush()`
- `handleSkipBeforeArchetype`: `upsertRow("characters", {name: "Blank"})` + `triggerPush()`
- Remove all `queryClient` and `setCacheData`/`getCacheData` calls
- Keep `supabase` for portrait upload/generation and AI name/description generation

**5. `src/pages/HostGame.tsx`** (256 lines)
- Replace `useOfflineQuery` calls with `useLocalRow("games", gameId)` + `useLocalRows("game_players", {game_id: gameId})` + `useLocalRows("characters")` + `useLocalRows("profiles")`
- Remove `useOfflineGameSession`, `offlineStorage` imports
- Build player-profile join in a `useMemo`
- Realtime channels: on event, call `pullAll()` instead of `queryClient.invalidateQueries`
- `endGame`: `upsertRow("games", {status: "ended"})` + direct supabase call
- `activateSection`: `upsertRow("games", {current_section: sectionId})` + direct supabase call

**6. `src/pages/PlayGame.tsx`** (already shown in context — 180 lines)
- Replace `useOfflineQuery` calls with `useLocalRow("games", gameId)` + `useLocalRows("game_players", ...)` + `useLocalRows("characters", {user_id})`
- Remove `offlineQueue`/`offlineStorage` imports
- `selectCharacter`: `upsertRow("game_players", {...})` + `triggerPush()`
- Realtime: call `pullAll()` on events

### Files to delete (4)

- `src/lib/offlineQueue.ts`
- `src/hooks/useOfflineQuery.ts`
- `src/lib/offlineStorage.ts`
- `src/hooks/useOfflineGameSession.ts`

### Key patterns applied everywhere

All mutations follow: `localStore.upsertRow()` → instant UI update via event → `triggerPush()` for background sync. No `QueryClientProvider` needed. The `useLocalRows`/`useLocalRow` hooks react to `localstore-change` events automatically.

