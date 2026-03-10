

## Audit: Offline Mode Bug Check

After reading through the full codebase, I found **two bugs** introduced by the offline/guest mode implementation.

---

### Bug 1: `processQueue()` race condition — can be called concurrently

**Where:** `AuthContext.tsx` lines 80-113

The `initSync` effect depends on `[loading, localGuestUser, session]`. When a local guest upgrade succeeds via `signInAnonymously()`:
1. First `initSync` call starts, awaits `signInAnonymously()`
2. `onAuthStateChange` fires → changes `session` and `localGuestUser` → triggers the effect again
3. Second `initSync` call starts while first is still running
4. Both calls reach `processQueue()` and process the **same items**, causing duplicate inserts

**Fix:** Add a concurrency guard at the top of `processQueue()`:
```typescript
if (_isSyncing) return { success: 0, failed: 0 };
```
Since JS is single-threaded, this check-then-set is safe. The first call sets `_isSyncing = true` synchronously; the second call sees it and bails out.

| File | Change |
|------|--------|
| `src/lib/offlineQueue.ts` | Add `if (_isSyncing) return { success: 0, failed: 0 };` as the first line of `processQueue()`, before reading the queue. |

---

### Bug 2: Local guest + server available = cache wipe

**Where:** `useOfflineQuery.ts` + all consumer components

When a local guest user is online but `signInAnonymously()` failed during `initSync` (e.g., temporary network glitch that recovered), `syncReady` becomes `true`. Queries fire using the Supabase anon key (no session). RLS blocks all user-scoped queries, returning **empty arrays**. These empty arrays overwrite the localStorage cache, destroying all offline data.

This also happens if the server becomes available *after* `initSync` already ran and failed the upgrade.

**Fix:** Gate `useOfflineQuery` itself on `isLocalGuest` — when the user is a local guest, never fetch from the server. This is cleaner than adding `!isLocalGuest` to every individual query's `enabled` prop.

| File | Change |
|------|--------|
| `src/hooks/useOfflineQuery.ts` | Import `isLocalGuest` from `useAuth()`. Add `!isLocalGuest` to the `canFetch` condition: `const canFetch = syncReady && !effectivelyOffline && !syncing && !isLocalGuest;` |

This single change protects every query in the app. Local guests always get cached data, never fire server queries.

---

### Everything else is solid

- **Auth.tsx signup flow:** Correctly distinguishes `isGuest && !isLocalGuest` (real anonymous → convert) vs standard signup. Good.
- **`enterGuestMode` fallback:** Creates local guest on failure, sets loading correctly. Good.
- **`initSync` local guest upgrade:** Remaps UUIDs before draining queue. Good.
- **`OfflineBanner` degraded state:** Listens for degraded events, auto-clears. Good.
- **`GuestBanner`:** Shows for both real and local guests (`isGuest` covers both). Good.
- **`Index.tsx` routing:** Shows Dashboard when `user` is set (includes local guest). Good.
- **`useIsOwner`:** Already guards with `!isGuest`. Good.
- **`useIsGameMaster`:** Falls back to localStorage for guests. Good.
- **Offline character creation/editing/deletion:** All queue correctly with temp IDs and cache updates. Good.
- **Game hosting offline:** Creates local games with cached sessions. Good.

