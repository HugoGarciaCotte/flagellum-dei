
## Why edits are failing today

I dug into the DB and the picker. The real culprit isn't `character_feats_level_unique` (that constraint no longer exists). Two things are biting your friends:

1. **`character_feat_subfeats` has `UNIQUE (character_feat_id, slot)`.** When the picker replaces a subfeat, it soft-deletes the old row (keeps it with `deleted_at`) and inserts a new row at the same slot. On push, both rows go up and the new one collides with the still-present old row → upsert fails, the row stays dirty, the change appears to "not save" until a manual refresh.
2. **`character_feat_subfeats.slot CHECK (slot BETWEEN 1 AND 3)`** but the code uses `MAX_SUBFEATS = 4` and creates slot 4 for archetypes. Pushes for slot 4 silently fail.

On top of that, the three-table chain (`characters → character_feats → character_feat_subfeats`) means any single push failure leaves the character looking half-edited, and there is no visible log — only a `sync-error` event that fires a transient sonner toast.

## The redesign — one character, one row

Treat a character as a single document. Move feats + subfeats into a `jsonb` column on `characters`. That:

- Eliminates every unique/FK constraint that's been causing collisions.
- Makes each save a single-row upsert by primary key — atomic, idempotent, offline-trivial.
- Halves the sync surface (no more per-feat / per-subfeat rows to track dirty).
- Keeps everything we read today (titles, categories, slot metadata) since those still come from the hardcoded `src/data/feats.ts`.

### New shape

`characters.feats jsonb` (default `'[]'`):

```text
[
  { "level": 1, "feat_id": "uuid", "is_free": false, "note": null,
    "subfeats": [ { "slot": 1, "feat_id": "uuid" }, ... ] },
  { "level": 2, "feat_id": "uuid", "is_free": false, "subfeats": [] },
  { "level": 0, "feat_id": "uuid", "is_free": true, "subfeats": [] }
]
```

No row-level uniqueness — the picker enforces "one paid feat per level" and "subfeat slots 1..N" in code, the same way it already does for UI display.

## Implementation steps

1. **Migration**
   - Add `feats jsonb NOT NULL DEFAULT '[]'::jsonb` on `characters`.
   - Backfill from existing `character_feats` + `character_feat_subfeats` (ignoring rows with `deleted_at`).
   - Leave the old tables in place for one release as a safety net (read-only fallback if `characters.feats` is empty). We can drop them in a follow-up once everyone has synced at least once.

2. **Local store**
   - Drop `character_feats` and `character_feat_subfeats` from `TABLES` in `src/lib/localStore.ts`.
   - Sync now only pulls/pushes `characters` for feat data — one row, no FK ordering, no chunking concerns.

3. **CharacterFeatPicker.tsx**
   - Replace `useLocalRows("character_feats")` / `useLocalRows("character_feat_subfeats")` with `useLocalRow("characters", characterId)` and operate on `character.feats`.
   - All mutations become "read the array → produce a new array → `upsertRow('characters', { ...character, feats: next, updated_at: now })`".
   - `upsertFeat`, `deleteFeat`, `addFreeFeat`, `setSubfeat`, auto-insert of fixed subfeats → pure array transforms, no UUIDs needed (we identify a level-feat by `level`+`is_free` and a subfeat by `slot`).
   - No more soft-delete dance, no more `softDeleteBy`, no more "extras" cleanup.

4. **Sync manager**
   - Remove the `character_feats` / `character_feat_subfeats` pull/push branches.
   - Keep the existing `sync-error` event but extend the detail with `{ table, recordId, message, at }` and persist the last N (say 20) failures in `localStorage` under `ls_sync_errors`.

5. **Visible sync log**
   - Add a small "Sync issues" affordance on `CharacterSheet` (and a global one in the dashboard). When `ls_sync_errors` is non-empty for this character's row, show a subtle inline warning under the portrait: *"X change(s) couldn't sync — tap for details"*. Tapping opens a dialog listing `at / message`, with a "Retry now" button that calls `pushAll()` and a "Dismiss" button that clears the log.
   - Continue dispatching the sonner toast on first failure, but the persisted log means you and your friends can actually see what failed after the toast disappears.

6. **Migration on the client**
   - On first load after this change, if `characters.feats` is `[]` but legacy `character_feats` rows exist locally, build the array from local data and write it back once. This avoids a "blank feats" flash for users who pull before the server backfill reaches them.

## Out of scope

- No change to feat metadata (`src/data/feats.ts`), validation edge function, or UI components beyond the picker and the sync log surface.
- Dropping the legacy tables — that's a follow-up migration once we've confirmed nobody is reading from them.
- Any redesign of the dice / GM / scenario sync paths.

## Files touched

- `supabase/migrations/*` — add column, backfill.
- `src/lib/localStore.ts` — remove two tables; add sync-error log helpers.
- `src/lib/syncManager.ts` — drop feat-table branches; enrich error events; persist log.
- `src/components/CharacterFeatPicker.tsx` — rewrite mutations against `character.feats`.
- `src/components/CharacterSheet.tsx` — render the inline "sync issues" affordance.
- `src/components/OfflineBanner.tsx` *(optional)* — surface the global count.

## Risk / rollback

- The legacy tables stay in place, so if something goes wrong we can re-enable the old reader by restoring the two `TABLES` entries and the sync branches. No destructive SQL in step 1.
