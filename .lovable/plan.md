

## Fix: "Become a Game Master" should work offline for non-guest users

Currently, for non-guest authenticated users, clicking "Become Game Master" inserts into `user_roles` via a live database call (line 459-461). If offline, this silently fails with an error toast.

### Change

In `src/pages/Dashboard.tsx` (lines 458-467), add offline handling for non-guest users:

1. Check network status using `useNetworkStatus()`
2. When offline, queue the `user_roles` insert via `queueAction()` and optimistically set the GM flag in localStorage (same key pattern as guest: cache key `qs_is_game_master` set to `true`)
3. Invalidate the query so the UI updates immediately
4. When online, execute the insert normally (current behavior)

This ensures that whether guest or authenticated, offline or online, the "Become GM" action always succeeds locally and syncs later if needed.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Import `useNetworkStatus` and `queueAction`. In the non-guest branch of the onClick handler, check if offline — if so, queue the insert and set localStorage cache; if online, do the live insert as before. |

