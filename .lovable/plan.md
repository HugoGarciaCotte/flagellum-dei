

## Remove `useNetworkStatus` Checks — Use Try/Catch Instead

### Problem
Every mutation checks `if (!online)` or `if (effectivelyOffline)` using `navigator.onLine`, which is unreliable. If the server is dead but WiFi is connected, `online = true`, the code takes the server path, the call fails, and the data is lost.

### Approach
**Instead of checking `online` before deciding which path to take, always try the server call first and fall back to the offline queue on failure.** This makes every mutation resilient regardless of what the browser reports.

The pattern changes from:
```text
if (offline) { queue() } else { await supabase... }
```
to:
```text
try {
  const { error } = await supabase...;
  if (error) throw error;
} catch {
  queue(); // optimistic cache updates
}
```

### Changes by File

**1. `src/components/CharacterSheet.tsx` — `saveMutation`**
- Remove `effectivelyOffline` branching. Always try the server call. On catch, run the queue+cache logic that's currently in the offline branch.
- In `onSuccess`, always invalidate queries (the call succeeded, so we're online).
- Keep `effectivelyOffline` checks for UI-only things (disabling upload/generate buttons, showing "Portrait features available when online" text) — those are cosmetic and harmless if wrong.

**2. `src/pages/Dashboard.tsx` — `deleteCharMutation`, `handleCreateGame`, `handleJoinGame`**
- `deleteCharMutation`: Remove `if (!online)` branching. Try server delete, on catch fall back to queue+cache.
- `handleCreateGame`: Already has try/catch with `createLocalGame` fallback — just remove the `if (!online)` early return so it always tries the server first.
- `handleJoinGame`: Remove `if (!online)` guard. Try the server call, on failure show a toast (joining truly requires the server, but the error should come from the catch, not from `navigator.onLine`).

**3. `src/pages/PlayGame.tsx` — `selectCharMutation`**
- Remove `if (!online)` branching. Try server update, on catch fall back to queue+optimistic cache.

**4. `src/pages/HostGame.tsx` — `endGame`, `activateSection`**
- `endGame`: Remove `if (!online)` guard. Try the server call, on catch show the toast (ending a game truly requires the server).
- `activateSection`: Always update local state + cache first (already does this). Then try server call in a try/catch that silently ignores failure (already partially does this — just remove the `if (online)` gate).

**5. `src/components/CharacterCreationWizard.tsx` — `saveArchetype`, `saveSubfeat`, `saveFinalDetails`, `handleSkipBeforeArchetype`**
- Each has `if (!online) { queue } else { server }`. Change to: try server first, on catch run the queue+cache logic.
- Keep `!online` checks for UI-only disabling (upload/generate buttons) — cosmetic only.

**6. `src/components/CharacterFeatPicker.tsx` — 5 mutations**
- `upsertMutation`, `deleteMutation`, `addFreeFeatMutation`, `updateNoteMutation`, `setSubfeatMutation`: Same pattern — try server, catch falls back to queue+cache.
- `validateWithAI`: Already has try/catch that calls `action()` on error. No change needed.

**7. `src/hooks/useOfflineQuery.ts`**
- No change. Already handles server-dead via the `isError` fallback on line 52. Queries are fine.

**8. `src/hooks/useNetworkStatus.ts`**
- Keep the hook — it's still used for cosmetic UI (disabling buttons, showing offline banners). It just won't gate data-critical paths anymore.

**9. `src/components/OfflineBanner.tsx`**
- No change. Its degraded-mode detection already fires when queries fail (line 52 of useOfflineQuery).

### Summary
- **11 mutations** across 5 files get the try/catch pattern
- **2 non-mutation functions** (`handleCreateGame`, `handleJoinGame`, `endGame`, `activateSection`) get try/catch
- `useNetworkStatus` remains for UI hints only
- Zero data loss when server is dead but browser says "online"

