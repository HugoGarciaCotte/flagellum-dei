Two fixes in one go:

## 1. Reliable GM character sync

- When the viewer is a host/DM, always full-pull characters for every player `user_id` in their games (not only first-time user IDs). Keep the viewer's own characters on the incremental path.
- This guarantees a player's existing characters show up on the GM dashboard even if their `updated_at` is older than the GM's `lastSync`.

## 2. Toast every sync error

Today many sync failures are only `console.warn`/`console.error`. Surface them all as toasts via `sonner` so the user actually sees them.

Wrap and toast errors in:
- `localStore.persist()` — currently swallows `QuotaExceededError`. Toast it (with a clear "Local storage full" message) and dispatch a `sync-error` event so the global listener also catches it.
- `localStore.setLastSync` / `appendSyncError` / `clearSyncErrors` `try/catch` blocks.
- `syncManager.doPull` — `catch (e)` in `pullAll` currently only warns. Toast it.
- `syncManager.pullTable` — `catch (e)` only warns. Toast it.
- `syncManager.doPush` — already records `sync-error` events; ensure each one produces a toast.
- `ensureSession` — anonymous sign-in failure toast.

Add a single global `sync-error` event listener (e.g. in `App.tsx` or an existing sync-status component) that calls `toast.error(...)` so we have one consistent surface and no duplicates. Throttle/dedupe identical messages within a short window to avoid spam (e.g. same message within 3s collapses).

Keep messages user-friendly and translated where a key already exists; fall back to the raw error message otherwise.

## Files

- `src/lib/syncManager.ts` — full-pull characters for non-self user IDs when host; toast on caught errors.
- `src/lib/localStore.ts` — toast on `persist` quota failures and other `try/catch` swallowed errors; emit `sync-error` events.
- `src/App.tsx` (or existing sync status component) — global `sync-error` listener that fires `toast.error` with dedupe.

## Validation

- Reload preview, confirm GM still sees players' current characters.
- Simulate a quota error by filling localStorage in devtools; confirm a toast appears.
- Confirm no duplicate toast storms during a single sync cycle.