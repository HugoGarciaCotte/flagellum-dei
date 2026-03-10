

## Fix: Guest mode breaks feat display and mutations across multiple components

**Root causes** (3 interconnected issues):

### 1. `useOfflineQuery` ignores guest mode
The hook only falls back to localStorage cache when `!online`. Guest users are online, so their Supabase queries run, hit RLS errors, and return nothing — no feats displayed.

**Fix in `src/hooks/useOfflineQuery.ts`**: Import `useAuth` and treat `isGuest` the same as `!online` — disable retries/refetch, skip the query entirely (`enabled: false`), and return cached data.

### 2. Wizard doesn't populate query caches for feats/subfeats
`saveArchetype` updates `my-characters` cache but never seeds `character-feats-${charId}` or `character-feat-subfeats-${charId}`. So when CharacterFeatPicker mounts after the wizard, there's nothing to display.

**Fix in `src/components/CharacterCreationWizard.tsx`**:
- In `saveArchetype` (guest/offline branch): after creating the temp character feat, also set query data:
  ```ts
  queryClient.setQueryData(["character-feats", tempCharId], [
    { id: tempCfId, character_id: tempCharId, feat_id: featId, level: 1, is_free: false, note: null }
  ]);
  setCacheData(`character-feats-${tempCharId}`, [...]);
  queryClient.setQueryData(["character-feat-subfeats", tempCharId], []);
  setCacheData(`character-feat-subfeats-${tempCharId}`, []);
  ```
- In `saveSubfeat` (guest/offline branch): update `character-feat-subfeats` query data optimistically, same as CharacterFeatPicker's mutations do.

### 3. `CharacterFeatPicker` mutations only check `!online`
All 6 mutations (`upsertMutation`, `deleteMutation`, `addFreeFeatMutation`, `updateNoteMutation`, `setSubfeatMutation`, `validateWithAI`) use `if (!online)` to decide local vs Supabase path. Guests hit the Supabase path and fail.

**Fix in `src/components/CharacterFeatPicker.tsx`**:
- Import `useAuth` and destructure `isGuest`
- Replace all `if (!online)` with `if (!online || isGuest)` (~6 locations)
- In `validateWithAI`: change `if (!online)` to `if (!online || isGuest)` to skip validation for guests

### Summary of files changed

| File | Change |
|------|--------|
| `src/hooks/useOfflineQuery.ts` | Add `isGuest` awareness — treat guest as offline for query behavior |
| `src/components/CharacterCreationWizard.tsx` | Seed `character-feats` and `character-feat-subfeats` query caches in guest/offline save paths |
| `src/components/CharacterFeatPicker.tsx` | Import `isGuest`, replace `!online` → `!online \|\| isGuest` in all mutations and validation |

