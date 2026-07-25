## The bug

The toast "Couldn't sync game_players: duplicate key value violates unique constraint `game_players_game_id_user_id_key`" fires every time an existing player opens a game they already joined. Backgrounds appearing broken is a side effect — the sync loop keeps erroring, so the client stays stuck on the failed push instead of pulling fresh game state (including `current_section` changes that drive the background).

### Why

`src/pages/JoinGame.tsx` calls the `join_game_by_code` RPC. That RPC already server-side inserts the `game_players` row (`ON CONFLICT DO NOTHING`) with its own server-generated `id`.

Then the client does:

```ts
upsertRow("game_players", {
  id: crypto.randomUUID(),   // ← brand new local id
  game_id: game.id,
  user_id: user.id,
  ...
});
triggerPush();
```

Push in `syncManager.ts` does `.upsert(chunk, { onConflict: "id" })`. Since the local `id` is new but `(game_id, user_id)` already exists from the RPC, Postgres rejects with the unique-constraint error. The local row stays dirty forever → the toast reappears on every sync.

## The fix (frontend only, no schema change)

`src/pages/JoinGame.tsx`
- Remove the client-side `upsertRow("game_players", {...})` and `triggerPush()` — the RPC already created the row.
- Replace with `await pullTable("game_players", { game_id: game.id, user_id: user.id })` so the authoritative row lands in local cache before navigating to `/game/:id/play`.

`src/lib/syncManager.ts` (recovery for already-affected users)
- In the `game_players` "own" push branch, when the upsert fails with the `game_players_game_id_user_id_key` unique-violation, treat it as recoverable: mark the local row succeeded (so `clearDirtyFor` drops it) and immediately trigger a scoped `pullTable("game_players", { game_id, user_id })` so the real server row replaces the phantom local one. This clears the persistent error toast for everyone currently stuck without waiting for them to re-join.

No DB migration, no changes to `PlayGame.tsx`, `HostGame.tsx`, or the RPC.

## Verification

1. New player joins via `/join/CODE` → no toast, lands in Play view, background renders.
2. Existing player who was seeing the loop opens the game once → toast disappears after the first sync, background renders.
