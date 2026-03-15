

## Delay sync checkmark unless loading lasted > 2s

**File:** `src/components/OfflineBanner.tsx`

Track when syncing starts with a timestamp. On `sync-synced`, only show the checkmark if the sync lasted more than 2 seconds.

- On `sync-syncing`: store `Date.now()` in a ref
- On `sync-synced`: compare elapsed time; only set `justSynced = true` if `>= 2000ms`

