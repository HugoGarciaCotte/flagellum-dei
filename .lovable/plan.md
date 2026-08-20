# Fix "foreign game_players row — no write permission" sync noise

## What's happening

The sync engine keeps a local copy of every membership row of the games you host or join, including rows that belong to other players. When one of those foreign rows ends up marked as "needs pushing" (typically after an identity change — guest to account, or switching accounts — or after a stale local copy from an older session), the push step correctly refuses to send it (the database only lets each player write their own membership), and then reports it as a user-facing sync error.

Nothing is actually lost or broken: the row belongs to another player and the server copy is authoritative. The problem is that a harmless, non-actionable situation is surfaced as a scary "Sync issues" error you cannot resolve, and the errors you see are dated May 2026 — they are stale entries persisted in the browser that never expire.

## What to change

1. **Stop treating foreign membership rows as errors.** When a dirty `game_players` row does not belong to the current user:
   - Compare the local copy with the server copy for that row.
   - If they match (or the local copy is just older), silently drop the dirty marker and refresh from the server — no error, no parked entry.
   - Only if the local copy genuinely diverges (a real unsent edit) park it as before with a clear message.

2. **Never mark foreign rows dirty in the first place.** Guard the local store so identity-remap and refresh paths only flag rows the current user owns; foreign rows pulled from the server stay clean.

3. **Expire stale sync errors.** Drop recorded errors older than ~48 hours when the panel loads, and make the "Repair synchronization" action clear resolved entries so the banner disappears once the situation is healed.

4. **One-off cleanup for the current state.** On startup, sweep any existing dirty/parked `game_players` rows that are not the current user's and clear them, so the two May 2026 errors go away without you having to clear browser storage.

## Technical notes

- `src/lib/syncManager.ts` — `doPush()` `ownedTables.game_players: "drop"` branch: replace the unconditional `quarantineRow(..., "foreign-owner")` with a compare-against-server reconciliation (`pullTable("game_players", { id })`, then diff on meaningful fields: `character_id`, `deleted_at`). Clear the dirty marker on match.
- `src/lib/localStore.ts` — add an owner guard in `markDirty` callers for `game_players`; add TTL pruning in `getSyncErrors`/`appendSyncError`; add a startup sweep that removes foreign `game_players` entries from `_dirtyRows` and `_quarantine`.
- `src/components/SyncIssuesPanel.tsx` — after "Repair synchronization", re-read state and drop entries whose underlying row is no longer dirty or parked.
- Add unit tests in `src/lib/localStore.test.ts` for: foreign row never marked dirty, stale error pruning, foreign-row sweep.
