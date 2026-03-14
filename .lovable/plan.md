

## Incremental Sync with Soft Deletes and Dirty-Row Tracking

### Overview

Replace the current "download everything / upload everything" sync with a timestamp-based incremental approach. Instead of hard-deleting rows, use a `deleted_at` column so that deleted rows are visible to timestamp-based pull queries.

### 1. Database Migration

Add `updated_at` (with auto-update trigger) and `deleted_at` columns to the 4 tables that lack them:

- `character_feats` — add `updated_at TIMESTAMPTZ DEFAULT now()`, `deleted_at TIMESTAMPTZ`
- `character_feat_subfeats` — same
- `game_players` — same  
- `user_roles` — same

Add `deleted_at TIMESTAMPTZ` to the 3 tables that already have `updated_at`:

- `characters`
- `games`
- `profiles`

Create triggers so `updated_at` auto-updates on every change (reuse existing `update_updated_at_column` function). Also ensure `updated_at` is bumped when `deleted_at` is set (the trigger already handles this since it fires on any UPDATE).

### 2. `src/lib/localStore.ts` Changes

**Dirty-row tracking**: Add a `_dirtyRows: Set<string>` (`"table:id"` format). `upsertRow` and `deleteRow`/`deleteBy` mark rows dirty. `setTable` and `mergeTable` (used by pull) do NOT mark dirty.

**New functions**:
- `mergeTable(table, rows)` — upserts incoming rows by ID into existing cache (instead of replacing)
- `getLastSync() / setLastSync(ts)` — stored in `ls_last_sync` localStorage key
- `getDirtyRows() / clearDirty()` — return dirty entries and clear the set
- `softDeleteRow(table, id)` — sets `deleted_at = now()` on the row instead of removing it
- `softDeleteBy(table, filter)` — same but by filter

**Read filtering**: `getTable`, `getRow`, `getBy` filter out rows where `deleted_at` is set, so the rest of the app sees them as gone without code changes.

### 3. `src/lib/syncManager.ts` Changes

**Incremental pull** (`doPull`):
- Read `lastSync` timestamp. If null, do full pull (first sync), then set timestamp.
- If set, add `.gte("updated_at", lastSync)` to every query and use `mergeTable` instead of `setTable`.
- Soft-deleted rows from server (where `deleted_at` is set) get merged in; local reads auto-filter them out.
- Parallelize independent queries with `Promise.all` (phases: roles+game_players lookup → games+profiles+characters → feats+subfeats).

**Incremental push** (`doPush`):
- Only upsert rows from `getDirtyRows()`, not entire tables.
- No more hard-delete calls to server — soft-deleted rows are pushed as normal upserts with `deleted_at` set.
- Remove the old deletion-tracking system (`getDeletions`, `trackDeletion`, etc.).

**Targeted pull** — new `pullTable(table, filter)`:
- Fetches a single table with optional filter, merges result.
- Used by realtime callbacks instead of full `pullAll()`.

### 4. Caller Changes

**`src/pages/PlayGame.tsx`** and **`src/pages/HostGame.tsx`**:
- Realtime callbacks call `pullTable("games", { id: gameId })` instead of `pullAll()`.
- HostGame player-list callback calls `pullTable("game_players", { game_id: gameId })`.

**`src/pages/Dashboard.tsx`**, **`src/components/CharacterFeatPicker.tsx`**, **`src/components/CharacterCreationWizard.tsx`**:
- Replace `deleteRow` → `softDeleteRow`, `deleteBy` → `softDeleteBy`. No other changes needed since reads auto-filter.

### 5. Eviction

`evictStaleGames` stays but now checks `deleted_at` in addition to status — fully removes rows from localStorage cache (not server) when older than 24h to reclaim space.

### Files changed

| File | What |
|---|---|
| DB migration | `updated_at` + trigger on 4 tables, `deleted_at` on all 7 |
| `src/lib/localStore.ts` | dirty tracking, mergeTable, soft delete, read filtering, lastSync |
| `src/lib/syncManager.ts` | incremental pull/push, pullTable, parallel queries |
| `src/pages/PlayGame.tsx` | targeted pullTable in realtime |
| `src/pages/HostGame.tsx` | targeted pullTable in realtime |
| `src/pages/Dashboard.tsx` | softDeleteRow/softDeleteBy |
| `src/components/CharacterFeatPicker.tsx` | softDeleteRow/softDeleteBy |
| `src/components/CharacterCreationWizard.tsx` | softDeleteBy |

