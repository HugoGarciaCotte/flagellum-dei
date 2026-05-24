## Diagnosis

GM-side data is stale because realtime only refreshes a subset of the player's tables:

- `HostGame.tsx`'s `game-players-{gameId}` channel re-pulls `game_players`, `characters`, `profiles` when game_players change, but **never pulls `character_feats` or `character_feat_subfeats`**.
- There are **no realtime subscriptions on `characters`, `character_feats`, or `character_feat_subfeats`**. So if a player picks/changes their character or edits feats after the GM's initial sync, the GM never sees the update until a full app reload.
- `GMPlayerList` only reads the local store — it has no fetch-on-open path, so opening the edit dialog also shows stale data.

## Fix (host-side only)

### 1. Extend the existing `game_players` realtime handler in `src/pages/HostGame.tsx`
After pulling `characters` for each player `user_id`, also pull that user's feats and subfeats:
- For each player's current `character_id`, `pullTable("character_feats", { character_id })`.
- For each resulting feat id, `pullTable("character_feat_subfeats", { character_feat_id })`.

This guarantees the GM has fresh feats whenever a player selects/changes a character.

### 2. Add a new realtime channel `game-chars-{gameId}` in `HostGame.tsx`
Subscribes to `postgres_changes` on three tables (no server-side filter, filter client-side):
- `characters` — on event, if `new.user_id` (or `old.user_id`) is in the current game's player set, pull `characters { user_id }`.
- `character_feats` — on event, look up the parent `character_id` locally; if it belongs to a game player, pull `character_feats { character_id }` and refresh that character's subfeats.
- `character_feat_subfeats` — on event, look up `character_feat_id` locally; if its character belongs to a game player, pull `character_feat_subfeats { character_feat_id }`.

This way the GM stays in sync whenever players add/remove feats or specialities, not just when they swap character.

### 3. Pull-on-open in `src/components/GMPlayerList.tsx`
When opening the edit dialog for a player:
- `pullTable("characters", { id: editPlayer.character_id })`
- `pullTable("character_feats", { character_id: editPlayer.character_id })`
- For each returned feat id, `pullTable("character_feat_subfeats", { character_feat_id })`

This guarantees a fresh sheet even if realtime missed an event (offline gap, reconnect, etc.).

## Out of scope
- No RLS changes — the existing `Host can view…` policies already grant the GM SELECT on the player's characters/feats/subfeats.
- No changes to player-side code, sync schedule, or the bottom character bar UI.
- No schema changes.

## Files to change
- `src/pages/HostGame.tsx` — extend `game_players` handler; add new `game-chars-{gameId}` channel.
- `src/components/GMPlayerList.tsx` — pull characters + feats + subfeats when opening the edit dialog.

## Technical notes
- `pullTable` only supports `.eq()` filters; we loop per id rather than `.in(...)`, which is fine for the small per-game cardinality.
- Realtime payload shape: handlers use `payload.new` for INSERT/UPDATE and `payload.old` for DELETE to resolve the affected `user_id` / `character_id` / `character_feat_id`.
- Client-side filtering against the local store avoids any need for per-id Supabase channel filters.