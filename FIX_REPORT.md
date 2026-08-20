# Fix Report — duplicate `game_players` key + empty GM player list

Date: 2026-08-20. Fix IDs: **DUP-01** (duplicate membership), **GM-01** (GM visibility).

## Symptom 1 — `duplicate key value violates unique constraint "game_players_game_id_user_id_key"`

### Root cause

The old join flow (pre A-03, before `join_game_by_code` existed on 2026-05-25) did a
client-side SELECT + INSERT and minted a **local `game_players` row with its own
fresh `id`** while the server already had (or soon got) a row for the same
`(game_id, user_id)`. Those phantom rows still sit in players' localStorage today.

The push path (`syncManager.ts` `pushRow`/`pushChunk`) upserts `game_players` with
`onConflict: "id"`. A phantom row's `id` doesn't exist server-side, so PostgREST
attempts an INSERT, which trips the `(game_id, user_id)` unique constraint → error
`23505`. `23505` is classified **terminal** → the row is quarantined. But quarantine
keeps the row in the local table, and the character mirror in `PlayGame.tsx:78-84` /
`CharacterCreationWizard.tsx` re-dirties it (`upsertRow("game_players", { ...myPlayer,
character_id })`) whenever the player's current character changes — so the same row
is pushed → 23505 → parked again, forever. (When the quarantine is full, it instead
hot-loops on backoff.) The `24/05/2026 23:30:20` timestamp is the original device-side
occurrence; LOG-01's new durable log/remote reporter is what finally surfaced it.

All *minting* sites were already fixed in earlier rounds (JoinGame/Dashboard use the
`join_game_by_code` RPC + `pullTable`; the wizard and PlayGame only update existing
rows) — what remained broken was the sync engine's handling of the legacy rows.

### Fix (DUP-01, client)

`src/lib/syncManager.ts`:

- `isDuplicateMembership()` — a `23505` on `game_players` can only be the
  `(game_id, user_id)` key (the upsert already conflicts on `id`), i.e. "this
  membership already exists server-side under a different row id".
- `adoptServerMembership()` — treat it as success: delete the local phantom, journal
  the adoption, and fire a reconciling `pullTable("game_players", { game_id, user_id })`
  so the server's row becomes the local row. A `character_id` that only the phantom
  carried re-syncs automatically: PlayGame's mirror effect re-applies it to the
  adopted row (which then pushes as a normal `id`-conflict UPDATE).
- Wired into **both** failure paths: `pushRow` (per-row fallback) and `pushChunk`'s
  single-row-chunk branch — previously the latter went straight to quarantine.
- One-shot heal in `attachOnlineListener()` (runs once per app load): quarantined
  `game_players` entries with `error.code === "23505"` are re-queued via
  `retryQuarantined`; the next push adopts them. This drains the May-era parked rows
  on every device without user action, which stops the recurring error reports.

## Symptom 2 — GM (`hugo@garcia-cotte.com`) sees none of his previous players

### Root cause

Not `game_players` RLS — the SELECT policy ("Host and members can view game players",
via `is_game_host`) is intact and status-independent. The break is one level down:

The CROSS-04 migration (`20260726034059`, SRV-02/SRV-04 hardening) added
`AND g.status <> 'ended'` to `is_host_of_player` / `is_host_of_character`. The host
arm of the **characters** SELECT policy ("Host can view all characters of game
players") uses `is_host_of_player`. Ending a session sets the game's status to
`ended` (`HostGame.endGame`), so *between sessions every hosted game is ended* and
the GM can no longer SELECT any player's characters. `doPull` then replaces the
local `characters` cache with the (empty) server-visible set, and
`GMPlayerList.tsx:152` skips any player with zero visible characters
(`if (chars.length === 0) continue;`) → the whole list renders `null`. The same
clause also RLS-rejected GM edits and GM portrait generation for those characters
(the edge function checks `is_host_of_player` too) — SYNC_INVESTIGATION.md
hypothesis 4 had already predicted this failure mode, and SRV-04 explicitly left
"should ended games retain visibility?" as a product decision. This bug report
answers it: yes.

### Fix (GM-01, new migration — no already-applied migration was edited)

`supabase/migrations/20260820110000_c8c159f4-1a1d-4ddb-9326-3fc250e3b0bd.sql`
recreates `is_host_of_player` and `is_host_of_character` **without** the
`g.status <> 'ended'` clause, keeping every `deleted_at IS NULL` guard (game and
membership). So:

- GM regains read/edit of players' characters across past (ended) sessions —
  the pre-July, long-standing behavior the GM player list was built on.
- Revocation remains real where it matters: soft-deleting a game or a
  `game_players` membership still cuts host access (the SRV-02 intent).

**Data repair: none needed.** Server-side data was never inconsistent — the unique
constraint always held (that's what raised 23505), memberships exist, and
`status = 'ended'` is the legitimate lifecycle state. Both symptoms were
client-store state (healed by DUP-01 at runtime) and a visibility rule (healed by
GM-01). One benign gap may remain: server `game_players.character_id` can be NULL
where the mirror only ever hit a phantom — it self-fills the next time each player
opens the game (mirror re-runs against the adopted row). No SQL can infer it sooner.

## Files changed

| File | Change |
|---|---|
| `src/lib/syncManager.ts` | DUP-01: duplicate-membership resolver in `pushRow` + `pushChunk`; one-shot quarantine release in `attachOnlineListener` |
| `src/lib/syncManager.test.ts` | New: 4 tests — adoption on single-row chunk, per-row fallback with healthy-row isolation, 23505 scoping to `game_players` only, selective quarantine release |
| `supabase/migrations/20260820110000_c8c159f4….sql` | New (GM-01): recreate `is_host_of_player` / `is_host_of_character` without the `status <> 'ended'` clause |
| `FIX_REPORT.md` | This report |

## Verification

- `npm test` — **42/42 pass** (3 files: 4 new syncManager + 31 localStore + 7 syncErrorReporter).
- `npx tsc --noEmit` — clean.
- `npx vite build` — succeeds (PWA precache generated). `npm run build`'s `prebuild`
  step (`bunx tsx scripts/generate-sitemap.ts`) can't run on this machine — no Bun
  installed (known BUILD-01 environment gap); Lovable's build environment has Bun and
  runs it. No sitemap-affecting change is in this fix.
- `eslint` on `syncManager.ts`: 47 vs 46 pre-existing errors — the +1 is one `row: any`
  parameter matching the file's existing signature style (the repo does not lint clean).

## What happens in production once Lovable syncs

1. **Migration applies** (`CREATE OR REPLACE FUNCTION` ×2): instant, no table
   rewrite, no data change, grants preserved. Effective immediately for every query.
2. **GM dashboards repopulate**: on Hugo's next pull (app foreground/online event),
   players' characters become visible again and "My Players" lists all players from
   his hosted, non-deleted games — ended ones included. GM character editing and
   portrait generation for those players work again.
3. **Player devices self-heal**: on next app load, parked duplicate-membership rows
   are re-queued and adopted (server row pulled, phantom removed). The recurring
   `game_players … 23505` reports stop; nothing new lands in `sync_errors` for this
   cause. Devices that stay offline heal whenever they next come online.

## Residual risk / manual steps for Hugo

- **Confirm the migration actually ran** on the linked Supabase project after the
  Lovable sync (Lovable applies repo migrations on sync, but verify): in the SQL
  editor run `SELECT prosrc FROM pg_proc WHERE proname = 'is_host_of_player';` — it
  must NOT contain `status <> 'ended'`. If Lovable didn't apply it, paste the
  migration file's SQL into the Supabase SQL editor once (it's idempotent).
- If the Lovable app doesn't redeploy automatically from the GitHub push, click
  **Update/Publish** in Lovable so clients get the new `syncManager` bundle.
- **Deliberate scope change to note**: hosts of *ended* games regain read/edit of
  their players' characters (the pre-July behavior the product relies on). A player
  who wants to cut ties with a past GM needs the game or their membership row
  deleted — same as before July.
- Old already-uploaded `sync_errors` rows (like the 24/05 one) remain in the table
  as history; new occurrences stop. Truncate manually if the noise bothers you.
