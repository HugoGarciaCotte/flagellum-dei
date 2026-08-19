# Sync-Error Investigation & Fix — "17 sync errors in one session"

Date: 2026-08-20. Incident: during a live session (likely on a phone-hotspot network),
several players saw repeated "synchronization errors"; one player counted 17 in a
single evening. This document covers (1) every way a sync error reaches a player,
(2) the ranked root-cause hypotheses for the incident, and (3) what was changed so
that no sync error is ever silently lost again (LOG-01).

Line numbers refer to the post-fix tree unless marked **(pre-fix)**.

---

## 1. Architecture recap (what "sync" is here)

- `src/lib/localStore.ts` — localStorage-backed local-first store (7 tables), dirty-row
  set, outbox metadata with backoff, quarantine store, journal ring buffer, error log.
- `src/lib/syncManager.ts` — pull (`doPull`, ~7 REST selects per full pull), push
  (blind upserts by id, chunked, per-row isolation), serialized via a promise-chain
  mutex with a 90s watchdog (`syncManager.ts:58-70`), retry scheduler.
- `src/integrations/supabase/client.ts` — instrumented fetch: **30s timeout on
  `/rest/v1/`**, **15s on `/auth/v1/`** (aborts as `TimeoutError: "sync-timeout"`),
  Date-header EWMA stale detection, failed fetches journaled.
- `src/lib/realtime.ts` — a `subscribeWithCatchup` helper that surfaces
  `CHANNEL_ERROR`/`TIMED_OUT`… which has **zero call sites** (dead code). All live
  channels subscribe raw.
- Service worker (vite-plugin-pwa, `vite.config.ts:18-92`) — precache + runtime
  caches for shell/images/fonts/storage only. The old `/rest/v1/` runtime caches were
  removed (ST-05) and are additionally purged at boot and before every pull
  (`src/lib/swCachePurge.ts`, `syncManager.ts:112`, `SyncIssuesPanel.tsx:70`).

### Sync triggers during a live session (why errors repeat)

| Trigger | Where | Frequency at the table |
|---|---|---|
| App returns to foreground | `syncManager.ts:536-540` → `pullAll().then(pushAll)` | every phone unlock/app switch — dozens per evening |
| `online` event | `syncManager.ts:531-534` | every hotspot flap |
| Any local edit (HP, feats, notes…) | `triggerPush()` 2s debounce (`syncManager.ts:518-524`), called from CharacterSheet/Details/Wizard/PlayGame/HostGame | every edit |
| Retry scheduler while queue non-empty | `scheduleRetry` (`syncManager.ts:501-515`), ≥5s, backoff-driven | continuous while a row can't push |
| GM advances a section | `games` UPDATE → realtime → `pullTable("games")` on **every player device** (`PlayGame.tsx:90-97`) | dozens per evening × N players |
| Player join / char change | GM device: pull cascade (2 + 2·uids pulls per event) (`HostGame.tsx:142-176`, `GMPlayerList.tsx:100-125`) | bursts |
| Websocket (re)subscribe | GMPlayerList catch-up pulls per hosted game (`GMPlayerList.tsx:116-121`) | every reconnect |

---

## 2. Every distinct sync-error emission point

### Surface A — toast ("Couldn't sync X: …")
`emitSyncError()` dispatches a `sync-error` CustomEvent; `OfflineBanner.tsx:31-40`
turns it into `toast.error`, deduped per (table,message) for only **3 seconds**.
This is what a player perceives as "a synchronization error". **(pre-fix)** none of
these were persisted anywhere — they were lost the moment the toast faded:

| # | Emission point | Trigger | Repeat risk |
|---|---|---|---|
| A1 | `syncManager.ts:46` `ensureSession` — "Not signed in — local changes will sync after you sign in" | any pull/push attempt with dirty rows and **no Supabase session** (local-guest fallback, or expired/refresh-failed session) | **extreme** — fires on every edit (2s debounce), every unlock, every online flap, all evening |
| A2 | `syncManager.ts:449` `pullAll` catch | any of ~7 REST selects in `doPull` throwing: `Failed to fetch`, `sync-timeout` (30s abort), auth refresh failure | **high** — one toast per foreground/online-flap on lie-fi |
| A3 | `syncManager.ts:468,478` `pullTable` error/catch | realtime-triggered targeted pulls failing (GM section advance → every player pulls `games`) | **high** — scales with GM activity × network loss |
| A4 | `syncManager.ts:490` `pushAll` catch | throw escaping `doPush` | low-medium |
| A5 | `syncManager.ts:251` per-row push failure (transient, server reachable) | HTTP-level PostgREST errors (5xx/429/408…), up to 8 attempts with 30s→30min backoff; each fresh edit re-arms a prompt retry (`noteEnqueued`, `localStore.ts:198-208`) | medium — per row per attempt |
| A6 | `localStore.ts:72` portrait >100 KB data-URI stripped during persist | **every** persist of `characters` while such a portrait is in cache (cache keeps the original, so it re-fires each write) | high *if* it occurs; portraits are normally storage URLs, so unlikely |
| A7 | `localStore.ts:93,95,98` localStorage quota / persist failure | every persist while storage is full | high if quota is hit |

### Surface B — persisted list (SyncIssuesPanel "Recent errors")
`appendSyncError()` → `ls_sync_errors`. **(pre-fix)** ring buffer capped at **20**,
destroyed by the panel's "Clear errors" (`clearSyncErrors`) and by `clearAll()` on
sign-out/user-switch (`localStore.ts:655-675`) — i.e. routinely lost.

| # | Emission point | Trigger |
|---|---|---|
| B1 | `syncManager.ts:126-131` **(pre-fix)** first-4-selects pull failure (also re-toasted via A2 → double entry) | pull failure |
| B2 | `syncManager.ts:250` **(pre-fix, same as A5)** push row transient failure | push failure |
| B3 | `localStore.ts:306` "Change parked: …" on quarantine (terminal error / RLS rejection / max attempts / foreign owner) | e.g. 42501, 23503, 0-row RLS-rejected update (`syncManager.ts:375-391`) |
| B4 | `localStore.ts:285` "Quarantine full" (cap 100) | pathological |
| B5 | `realtime.ts:36` `CHANNEL_ERROR`/`TIMED_OUT` — **dead code, zero call sites**. Every live channel (`PlayGame.tsx:92-95`, `HostGame.tsx:130-176`, `GMPlayerList.tsx:81-125`, `DiceRoller.tsx:81-93`) subscribes raw → **channel drops are completely silent** | realtime drop |

### Surface C — journal (`ls_sync_journal`, cap 300)
Diagnostic only, never shown to users, unaffected by this incident: failed fetches +
timings (`client.ts:66-76`), stale-response detection, watchdog resets
(`syncManager.ts:62`), push/pull summaries.

### Notable non-emitting failure paths
- Fetch-level throws for whole push chunks are journaled and re-armed **silently**
  (`syncManager.ts:293-299`) — good (no toast spam), but pre-fix they were also
  absent from the user-visible log.
- `isReachable()` is **never called** (only `lastReachable()` at
  `syncManager.ts:227`), so the reachability cache stays `null` forever and all
  per-row connectivity failures take the silent `noteDeferred` path. Accidentally
  protective against push-toast spam; means the pull side is the loud one.
- Realtime channel drops: silent everywhere (see B5).

---

## 3. Ranked root causes for "~17 errors in one evening"

1. **Foreground/`online`-flap pulls failing on lie-fi (A2).** Every phone unlock and
   every hotspot flap runs `pullAll` (`syncManager.ts:531-540`); `navigator.onLine`
   is true on a connected-but-dead hotspot, so `doPull`'s selects throw
   `Failed to fetch` or hang 30s into `sync-timeout` (`client.ts:14-18,37-39`) →
   one toast each time (`syncManager.ts:449`). Players unlock their phones dozens of
   times per session; ~17 failures over an evening on a shaky hotspot is exactly
   this signature. **Probability: very high.**

2. **Realtime-triggered `pullTable("games")` failing per GM section-advance (A3).**
   Each advance UPDATEs `games`; every player device reacts by pulling
   (`PlayGame.tsx:90-97`). With packet loss, a visible fraction of those pulls fail →
   "Couldn't sync games: …" toasts spread across the evening. Requires the websocket
   to be up while REST is flaky — common in bursts. **Probability: high** (likely
   compounding #1).

3. **A player without a valid session all evening (A1).** Two entry paths:
   (a) anonymous sign-in failed at join time → **local-guest** fallback with no
   session at all (`AuthContext.tsx:158-168`); (b) the anonymous/JWT session expired
   mid-session and the refresh failed on the bad network → `SIGNED_OUT`. Either way,
   with dirty rows queued, *every* sync trigger emits "Not signed in…"
   (`syncManager.ts:42-48`) — one toast per edit/unlock (3s dedup only). One player
   counting 17 while others saw fewer fits this per-device failure mode perfectly.
   **Probability: high for exactly-one-player.**

4. **Push retries surfacing per-row errors (A5 + B3).** Genuine PostgREST error
   responses (RLS 42501 → quarantine "Change parked", constraint errors, 5xx under
   load) toast per row per attempt. Also note: host policies require the game to be
   active (`is_host_of_player`, migration `20260726034059:52-63`), so GM edits to
   player characters queued past game-end get RLS-quarantined. **Probability:
   medium** — would also leave quarantine entries; worth checking the player's panel.

5. **localStorage quota / oversized portraits (A6/A7).** Re-toasts on every persist
   once triggered. Portrait flow uses storage URLs, so only likely if an AI portrait
   or import ever landed as a base64 data-URI. **Probability: low, but loud if
   present.**

6. **Realtime channel drops (B5): not an error source — the opposite.** Drops are
   silent, so players missed GM updates until the next foreground pull; the errors
   they *did* see came from the recovery pulls. Contributing factor, not an emitter.

Side observation (not error-related): the incident-day hotfix migration
(`20260819212323…sql`, commit `fe5536f`) rewrote `feats` server-side for two
characters and bumped `updated_at`. If either player had unpushed local edits, the
dirty-wins rule (`localStore.ts:512-522`) + blind upsert push would re-clobber the
server fix without any error. Worth re-checking those two characters' data.

Why "17" was even countable: the pre-fix persisted list capped at 20 — the player
could still see ~17 in the panel *if* nothing wiped it; every toast beyond the ring
buffer or after a "Clear errors" / repair was unrecoverable. Hence Mission 2.

---

## 4. Mission 2 — what changed (LOG-01)

Requirement (verbatim): *"from now on, any synchronization error must somehow be
saved in the logs."*

### a) Durable local persistence
- New **append-only durable log** `ls_sync_error_log`, cap **500** entries
  (`localStore.ts:397-399`), written by the single funnel `appendSyncError`
  (`localStore.ts:453-469`).
- The **active list** `ls_sync_errors` (cap 20) is kept as the panel's dismissible
  view — same key, same shape, same accessor (`getSyncErrors`).
- **Identical consecutive errors collapse** into one entry with `count` + `firstAt`
  (5-minute window, `collapseOrPrepend`, `localStore.ts:434-451`) so one flapping
  error cannot flush the history of 500 distinct events, while the repeat count
  (the "17") is preserved instead of spamming.
- Both `emitSyncError` implementations (`localStore.ts:50-56`,
  `syncManager.ts:31-37`) now **funnel through `appendSyncError`** — every
  formerly-toast-only error (A1–A7) is persisted. Two former double-log sites were
  deduplicated (`syncManager.ts:129`, `syncManager.ts:251`).
- **Nothing destroys the durable log anymore**: `clearSyncErrors()` clears only the
  active list (`localStore.ts:471-474`); `clearAll()` (sign-out/user switch)
  preserves the durable log explicitly (`localStore.ts:664-670`); the repair ladder
  (`SyncIssuesPanel.tsx:66-79`) and SW cache purge never touched localStorage.
- Messages truncated to 300 chars to bound storage (~≤150 KB worst case).
- New accessor `getSyncErrorLog()` for future diagnostics UI / support dumps.

### b) Console mirroring
Every appended error logs `console.error("[sync-error] <table>: <message>", {ids})`
**first**, before any storage write, so it appears in devtools even under quota
exhaustion (`localStore.ts:456-459`).

### c) Remote logging (implemented — the auth/RLS model allows it cleanly)
All app writes run as the `authenticated` role (email users *and* Supabase
anonymous-auth guests), so an insert-only table is safe:
- **Migration** `supabase/migrations/20260820100000_6d317e4e….sql`: table
  `public.sync_errors` (`user_id` defaults to `auth.uid()`, occurrence time,
  table/ids/message/count, `device` jsonb, server `created_at`). RLS: INSERT for
  `authenticated` with `auth.uid() = user_id`; SELECT only for owner/admin via
  `has_role`; **no UPDATE/DELETE policies** → append-only from clients. Message
  length CHECK ≤ 2000 guards abuse.
- **Reporter** `src/lib/syncErrorReporter.ts`, wired in `App.tsx:31-33`:
  - receives every appended error via a forwarder hook
    (`setSyncErrorForwarder`, `localStore.ts:411-417`) — localStore stays free of
    Supabase imports (no cycle with `client.ts`, which imports `journal`);
  - queues to `ls_sync_error_outbox` (cap 200, duplicates collapsed) because sync
    errors mostly happen **while the network is broken** — a naive immediate insert
    would ship almost nothing;
  - flushes on `online`, after each successful sync cycle (`sync-synced`), 10s
    debounced after enqueue, and 5s after boot; batches of 50, oldest first;
  - **fire-and-forget**: never throws, never blocks the sync mutex, never calls
    `appendSyncError` about its own failures (no recursion — upload problems are
    `console.debug` only);
  - no session (local guest / signed out) → entries stay queued; the outbox is
    dropped on user switch in `clearAll` so errors aren't attributed to the wrong
    account (the durable *local* log is what satisfies "never lost");
  - terminal server responses (table not yet migrated `42P01`/`PGRST205`, RLS
    denial `42501`, schema-cache misses) disable remote logging for the page load
    but keep the queue, so the client degrades gracefully **before the migration is
    applied** and recovers after.
  - `supabase.from("sync_errors" as any)` cast matches the existing codebase idiom;
    regenerate `src/integrations/supabase/types.ts` after applying the migration to
    tighten it.

### d) SyncIssuesPanel
Unchanged API (`getSyncErrors`/`clearSyncErrors`); only addition is a "×N" repeat
badge for collapsed entries (`SyncIssuesPanel.tsx:137-142`).

### e) Tests (vitest) — 38 passing (23 pre-existing + 15 new)
- `src/lib/localStore.test.ts` (+8): console mirroring; dual-write active+durable;
  collapse counting; `clearSyncErrors` preserves the durable log; `clearAll`
  preserves the durable log; caps 20/500; forwarder delivery + throwing-forwarder
  isolation; message truncation. (Existing B-15 semantics — active list cleared on
  user switch — still hold and still pass.)
- `src/lib/syncErrorReporter.test.ts` (new, mocked Supabase client): queue collapse
  + cap 200; no-session leaves queue; successful flush inserts mapped rows and
  drains; transient failure keeps queue; terminal failure disables without dropping
  the queue; flush never throws even if auth explodes; end-to-end forwarding from
  `appendSyncError` into the outbox.

### Files changed
- `src/lib/localStore.ts` — error-log rework (funnel, durable log, collapse,
  forwarder hook, clearAll preservation)
- `src/lib/syncManager.ts` — `emitSyncError` funnels into the persisted log; two
  double-log sites removed
- `src/lib/syncErrorReporter.ts` — **new** remote fire-and-forget reporter
- `src/App.tsx` — `initSyncErrorReporter()`
- `src/components/SyncIssuesPanel.tsx` — ×N repeat badge
- `supabase/migrations/20260820100000_6d317e4e-0d09-473f-854b-bc28b39e5c15.sql` — **new** `sync_errors` table + RLS
- `src/lib/localStore.test.ts`, `src/lib/syncErrorReporter.test.ts` — tests

### Build / test status
- `npx vitest run`: **38/38 pass**.
- `npm run build`: **passes** (note: `prebuild` uses `bunx tsx`; this machine has no
  bun, so it was run with a `bunx→npx` PATH shim — no repo change).
- `npx tsc --noEmit -p tsconfig.app.json`: **clean**.
- `npm run lint` fails **pre-existing** on main (e.g. 32 errors in untouched
  `localStore.ts`, 47 in `syncManager.ts`, mostly `no-explicit-any`/`no-empty`);
  changed files are at/below their baselines; the new reporter carries 3
  `no-explicit-any` from the unavoidable `from("sync_errors" as any)` cast (same
  idiom as syncManager) until types are regenerated.

### Deployment notes
1. Apply the migration (Lovable/Supabase migration flow). Until then, clients queue
   remotely-bound errors locally and self-disable uploads per page load — no user
   impact.
2. Regenerate `src/integrations/supabase/types.ts` to include `sync_errors`.
3. To read the logs: owner/admin account →
   `select * from sync_errors order by created_at desc;`

### Recommended follow-ups (out of scope, not done)
- Route the live game channels through `subscribeWithCatchup` (realtime.ts is
  currently dead code) so channel drops are logged and players auto-heal via
  catch-up pulls.
- Suppress the A2/A3 pull-failure *toast* when `navigator.onLine` flaps (keep the
  log entry) — the durable log now makes it safe to be quieter in the UI.
- Call `isReachable()` before counting push attempts (it is currently never
  invoked, so `lastReachable()` is always `null`).
- Investigate the two characters touched by `20260819212323…` for dirty-wins
  clobbering of the server-side feats fix.
