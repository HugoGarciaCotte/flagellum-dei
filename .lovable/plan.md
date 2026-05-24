# Trickster vanishes between browsers — push is fire-and-forget

## What's happening

When the GM grants Trickster from the dashboard:

1. `CharacterFeatPicker` writes the row to `localStorage` and calls `triggerPush()`.
2. `doPush()` in `src/lib/syncManager.ts` calls `supabase.from('character_feats').upsert(...)` but **never reads the `{ error }` from the response** — the Supabase JS client returns errors in the response, it doesn't throw on RLS denial.
3. After the loop, `store.clearDirty()` runs **unconditionally**, so even if the upsert silently failed, the row is marked clean and never retried.
4. The local browser still shows the feat (it's in `localStorage`), but the DB has no row.
5. Any other browser — or this one once a scoped `pullTable` runs after the recent fix — sees the DB truth (no Trickster).

The DB confirms: Lily has no Trickster row, so the write never landed.

The likely root cause of the silent failure is RLS: the host policies on `character_feats` and `characters` require Lily to be a `game_players` row in a game where `host_user_id = auth.uid()`. From the dashboard the GM may be editing a character that isn't currently in any of their active games, or the auth identity differs (e.g. anonymous session in the other browser). We need the error surfaced to be sure.

## Fix

### 1. Make `doPush` honest about failures (`src/lib/syncManager.ts`)

- Capture `{ data, error }` from each upsert. On error:
  - `console.error` with table, ids, error message (so we can finally see RLS denials in the console).
  - Track the failed ids per table.
- After all tables are pushed, clear dirty **only** for rows that pushed successfully. Failed rows stay dirty and will be retried on the next `triggerPush`.
- Add a one-shot custom event `sync-error` with `{ table, ids, message }` so the UI can surface a toast.

### 2. Toast on push failure

- In a top-level mount (e.g. `App.tsx` or wherever `sync-synced` is already listened to), listen for `sync-error` and `toast.error("Couldn't save change — …")` with the message. This makes silent RLS failures user-visible immediately.

### 3. Verify the actual error

Before fixing optimistically: once the new logging lands, the user reproduces "give Trickster from dashboard" and we read the console / network panel to see whether it's:
- RLS denial → need to scope where the GM may grant feats (only inside an active game where the player is a member), or
- Auth identity mismatch (guest vs full user in the second browser), or
- Something else.

We'll only adjust the actual UX/permission rules after confirming. This plan does **not** change RLS, the picker's gating, or the data model.

## Out of scope

- Changing RLS policies.
- Restricting where the GM can grant feats from.
- Re-architecting the local-first sync. We're patching the bug that silently drops failed writes.

## Files

- `src/lib/syncManager.ts` — per-row failure tracking, conditional `clearDirty`, error event.
- `src/App.tsx` (or wherever sync events are listened to) — toast on `sync-error`.
