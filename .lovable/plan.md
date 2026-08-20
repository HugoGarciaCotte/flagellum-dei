# Fix "sync-timeout" errors that appear with a healthy connection

## What is happening

The errors you see are not caused by your internet. Two things are confirmed from the code and from the live request log:

1. **The GM player list fires one request per player, one after another.** For your account (20+ hosted games, ~40 distinct players), that is ~80 separate requests to the backend, executed strictly in sequence through the single global sync queue, each one preceded by an offline-cache purge that can wait up to 2 seconds. The captured network log shows exactly this pattern: `characters?user_id=eq.…` then `profiles?user_id=eq.…`, roughly one per second, for dozens of players.
2. **Every backend request has a hard 30-second client-side abort.** When it fires, it surfaces as `TimeoutError: sync-timeout`. Any real request that sits behind that long queue (or is deprioritised because the tab is in the background) trips the abort even though the network is fine.

The dataset itself is tiny (45 characters, 32 profiles, 42 memberships) and the read policy on profiles is unrestricted, so the server is not the bottleneck — the client-side fan-out is.

The old `game_players … NetworkError` entry from 12:01 is a separate, already-expired blip that the panel simply never forgets.

## What to change

### 1. Remove the per-player request fan-out
Replace the loop in the GM player list that pulls characters and profiles one player at a time with a **single batched pull for all players at once** (one characters request, one profiles request), and do the same for the realtime catch-up path so a burst of events cannot re-create the fan-out.

### 2. Stop the redundant cache purge on every single pull
The offline-cache purge only needs to run once at startup and on full refreshes, not before each individual table pull. Dropping it from the per-table pull removes up to 2 seconds of dead time per request.

### 3. Treat aborts/timeouts as silent retries, not user-facing failures
A timed-out or aborted request already has a backoff-and-retry path. It should not be written to the "Recent errors" list, because it resolves itself and only alarms you. Only genuine server refusals and repeated failures stay visible.

### 4. Expire stale errors
Errors older than a few hours are dropped automatically when the panel loads, so entries from earlier sessions (like the 12:01 one) stop lingering.

### 5. Keep the panel honest about "pending"
"1 local change is waiting to sync" stays as-is — it is accurate and disappears once the queue drains.

## Technical notes

- `src/components/GMPlayerList.tsx`: the `useEffect` looping over `playerUserIds` with sequential `pullTable("characters", { user_id: uid })` / `pullTable("profiles", { user_id: uid })` becomes one batched call each. Requires a batched variant of `pullTable` accepting an `in` filter (e.g. `pullTableIn(table, column, values)`), replacing rows for the given set.
- `src/lib/syncManager.ts`: remove the `purgeSwRestCaches()` race from `pullTable`; keep it in `doPull` and at boot. Add the batched pull helper.
- `src/lib/syncManager.ts` / `src/lib/localStore.ts`: in the error reporting path, skip `appendSyncError` when `isConnectivityError(...)` matches (`TimeoutError`, `AbortError`, `sync-timeout`, `NetworkError`); still journal them and still schedule the retry. Add a TTL sweep (e.g. 6h) when reading stored sync errors.
- Tests in `src/lib/localStore.test.ts`: cover the TTL sweep and that connectivity errors are not persisted as user-visible errors.

## Verification

- Open the dashboard as the GM account and confirm the request log shows two batched player-data requests instead of ~80 sequential ones.
- Confirm the Sync Issues banner clears and no new `sync-timeout` entries appear during normal use.
- Confirm the pending local change still pushes and the banner disappears afterwards.
