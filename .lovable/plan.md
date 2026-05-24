# Why Outlaw Wisdom appears twice (and Trickster shouldn't be there)

In the DB, Lily has exactly these feats (one row each):

```
Bone Triptych (used once)  free
Whispers of Madness        free
Repented Heretic           lvl 1
Outlaw Wisdom              lvl 2
Disguise                   lvl 3 (soft-deleted)
⭐ Miracle                  lvl 4
```

But the DM's screen shows a second `Outlaw Wisdom` and a `Trickster` that don't exist server-side. They're stale rows left over in the DM's `localStorage`.

## Root cause

`pullTable(table, filter)` in `src/lib/syncManager.ts` does:

```ts
const { data } = await query;
if (data) store.mergeTable(table, data as any);
```

`mergeTable` only **upserts by id** — it never removes local rows that the server no longer returns. So when a scoped pull asks "give me all `character_feats` where `character_id = X`", any row that was deleted (hard delete or re-created with a new id) on the server side stays in the DM's local cache, and the UI shows the union of old + new.

This affects every `pullTable(...)` call that scopes by something other than primary key — feats, subfeats, characters under a user, game players, etc.

## Fix

Make scoped pulls reconcile by replacing the slice they queried.

1. Add `replaceBy(table, filter, rows)` to `src/lib/localStore.ts`:
   - Drop every existing row matching `filter`.
   - Insert the new `rows` (already filtered by the same predicate on the server side).
   - Persist once.

   Important: rows mutated locally and not yet pushed (`isDirty(table, id)`) must be preserved — otherwise we'd erase the DM's in-flight edits. So keep dirty rows whose id is not in the incoming set.

2. In `pullTable`, when a `filter` is provided, call `replaceBy(table, filter, data)` instead of `mergeTable`. With no filter, keep `mergeTable` (full pulls without `since` already use `setTable`, scoped without filter is rare).

3. Sanity check the same pattern in `doPull` for the per-character / per-game scoped pulls — those already replace entire tables with `setTable([])` then merge, so they're fine. The bug is specifically in the on-demand `pullTable` path used by `GMPlayerList.openEdit` and friends.

## Verify

- Hard-refresh the DM browser to force a fresh pull.
- Re-open Lily as GM. Expect: only Outlaw Wisdom once, no Trickster.
- As a regression check: delete a feat as the player, then re-open as GM — the deletion should propagate (already worked via `deleted_at`), and a *hard*-deleted row should disappear too.
- Add a feat as the player, re-open as GM — the new feat should appear (still works because `replaceBy` writes everything the server returned).

## Out of scope

- No schema changes, no RLS changes.
- No change to push logic or to the local-first writes (the offending screen reads, doesn't write).
- Not touching the broader incremental-sync `since` path — only the on-demand scoped `pullTable`.

## Files

- `src/lib/localStore.ts` — add `replaceBy`.
- `src/lib/syncManager.ts` — switch `pullTable` to `replaceBy` when a `filter` is supplied.
