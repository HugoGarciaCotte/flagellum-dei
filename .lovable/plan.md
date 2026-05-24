## Status

The GM-edits-player-character fix is **already in place** in `src/lib/syncManager.ts` (lines 188–217): pushes for `characters` split owned rows (upsert) from foreign rows (UPDATE only), so the host UPDATE policy is used and the INSERT `WITH CHECK (auth.uid() = user_id)` is no longer triggered.

## Audit of other synced tables for the same class of bug

`doPush` syncs: `profiles`, `user_roles`, `characters`, `games`, `game_players`.

| Table | Foreign rows in local store? | INSERT policy | Risk |
|---|---|---|---|
| `profiles` | Yes — GMPlayerList pulls every player's profile | `auth.uid() = user_id` | If any code path ever calls `useLocalRow("profiles", { user_id: otherUser })` and writes, the push would loop forever with RLS error |
| `user_roles` | Only own | own only | None |
| `characters` | Yes (players in hosted games) | `auth.uid() = user_id` | **Fixed** |
| `games` | Only host's own games (host owns) | host only | None |
| `game_players` | Yes — all players in hosted games | `auth.uid() = user_id` | Same latent risk as profiles if GM-side code ever mutates a foreign `game_players` row locally |

Today no code path writes foreign `profiles` or `game_players`, but the sync layer should not silently retry-spam if one ever does (e.g. a future Spotify token refresh, a GM kick action, a realtime merge with a stale local edit).

## Plan

Make `doPush` generic and defensive:

1. **Generalize the own-vs-foreign split** to every table that has a `user_id` column and a `WITH CHECK (auth.uid() = user_id)` INSERT policy: `profiles`, `characters`, `game_players`, `user_roles`.
   - Own rows → `upsert` as today.
   - Foreign rows on `characters` → `.update(...).eq("id", id)` (host UPDATE policy handles it).
   - Foreign rows on `profiles`, `game_players`, `user_roles` → **skip the push** (no server policy lets a non-owner write these), clear `pending_sync` / dirty flag for that row, and emit a single `sync-error` so it surfaces in the existing SyncIssuesPanel instead of looping every 2 seconds.

2. **Strip `created_at` from update patches** on foreign rows (already done for characters) — keep that uniform.

3. **No changes to pull or realtime**. `GMPlayerList.tsx` already subscribes to realtime postgres_changes on `characters`, `profiles`, and `game_players` and re-pulls on player edits, so the "GM sees player's changes" requirement is already covered.

4. **No DB migration** — existing policies are correct; this is purely client-side hardening.

## Files

- `src/lib/syncManager.ts` — refactor the `characters` branch in `doPush` into a small per-table policy table; add the "drop foreign-row dirty flag" path for tables where no foreign write is ever legal.

## Out of scope

- `character_feats` / `character_feat_subfeats`: no longer synced (feats live in `characters.feats` jsonb), so no risk.
- Direct `supabase.from(...)` calls in pages (Dashboard, HostGame, AdminTranslations, FeatEditorPanel, ScenarioEditorPanel, SpotifyPlayer): all operate on rows the current user is allowed to write per RLS. No changes needed.
