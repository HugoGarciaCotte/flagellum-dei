

## Plan: Sync Gate — Block All Queries Until Offline Queue Is Drained

### The Problem

Right now, when the app comes back online (or on page load with a pending queue), queries fire immediately and can fetch stale server data that overwrites local changes the user made offline. For local guests, queries fire with a fake UUID and return empty data, wiping caches.

### The Solution: Two-Phase Sync Gate

**Phase 1 — Auth upgrade (local guests only):** If the user is a `localGuest`, try `signInAnonymously()` to get a real session. If successful, remap all fake UUIDs in the queued actions to the real `user.id`. If it fails, stay in local guest mode (offline).

**Phase 2 — Queue drain:** Process the entire offline queue before allowing any queries to fire. A global `isSyncing` flag blocks all `useOfflineQuery` calls until the queue is empty.

### Architecture

```text
App loads / goes online
        │
        ▼
  ┌─ Local guest? ──Yes──► Try signInAnonymously()
  │                            │
  │                     ┌──Success──► Remap fake UUID → real UUID in queue
  │                     │              Clear local guest state
  │                     └──Fail──► Stay local guest (offline mode)
  │
  └─ No ─────────────────────┐
                              ▼
                    Queue has items?
                     │          │
                    Yes         No
                     │          │
                     ▼          ▼
              Set isSyncing   Queries enabled
              Process queue       │
              Clear isSyncing     │
                     │            │
                     ▼            │
              Queries enabled ◄───┘
```

### Changes

| File | Change |
|------|--------|
| `src/lib/offlineQueue.ts` | Add `isSyncing` global flag + `getIsSyncing()` getter. Add `remapUserId(oldId, newId)` function to rewrite all `user_id` references in queued actions. Update `processQueue` to set/clear the flag. |
| `src/hooks/useOfflineQuery.ts` | Import `getIsSyncing`. When `isSyncing` is true, set `enabled: false` and return cached data instead. |
| `src/contexts/AuthContext.tsx` | Add `syncReady` state (starts `false`). On mount/auth change: if local guest + online, attempt anonymous sign-in → remap queue → process queue → set `syncReady`. Expose `syncReady` on context. For non-local-guests with a pending queue, process queue first → then set `syncReady`. |
| `src/hooks/useOfflineQuery.ts` | Also check `syncReady` from `useAuth()` — queries stay disabled until `syncReady` is true. |
| `src/App.tsx` | Update `attachOnlineListener` callback — it already invalidates queries, but now the sync gate handles ordering automatically. |

### Key Logic

**offlineQueue.ts — user ID remapping:**
```typescript
export function remapUserId(oldId: string, newId: string) {
  const actions = getQueuedActions();
  for (const action of actions) {
    for (const key of Object.keys(action.payload)) {
      if (action.payload[key] === oldId) action.payload[key] = newId;
    }
    if (action.filter) {
      for (const key of Object.keys(action.filter)) {
        if (action.filter[key] === oldId) action.filter[key] = newId;
      }
    }
  }
  saveQueue(actions);
}
```

**AuthContext — sync gate on mount:**
```typescript
// After session resolves or local guest is restored:
useEffect(() => {
  async function initSync() {
    // If local guest and online, try to upgrade
    if (localGuestUser && !session?.user && navigator.onLine) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error && data.user) {
        remapUserId(localGuestUser.id, data.user.id);
        // session will be set by onAuthStateChange, local guest cleared
      }
    }
    // Process any pending queue before enabling queries
    if (getQueueLength() > 0 && navigator.onLine) {
      await processQueue();
    }
    setSyncReady(true);
  }
  if (!loading) initSync();
}, [loading]);
```

**useOfflineQuery — gate on syncReady:**
```typescript
const { syncReady } = useAuth();
const shouldEnable = syncReady && !effectivelyOffline 
  ? (options.enabled ?? true) 
  : false;
```

This ensures: local guest upgrade → UUID remap → queue drain → then and only then do queries fire with fresh, correct data.

