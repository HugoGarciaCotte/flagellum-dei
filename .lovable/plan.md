
# Sync overhaul: apply FIX_SPEC + FIX_SPEC_UNSTICK

Scope: 68 bugs from `FIX_SPEC.md` and the 12 stuck-state remediations + Repair UX from `FIX_SPEC_UNSTICK.md`. Executed in phases so P0 data-loss bugs are fixed and shippable before larger refactors.

## Phase 1 — P0 sync correctness (data-loss stoppers)

Client (`src/lib/localStore.ts`, `src/lib/syncManager.ts`, `src/contexts/AuthContext.tsx`):

- **SYNC-01** Persist dirty set to `localStorage` under `ls_dirty_rows`; load on init; add `persistDirtySet()` to `markDirty` / `clearDirty` / `clearDirtyFor`; clear on `clearAll()`. Drain queue at end of successful `pullAll` and on reconnect.
- **SYNC-02** In `setTableKeepDirty` and `replaceBy`, dirty local row ALWAYS wins over server snapshot (drop the `&& !incoming.has(id)` clause; swap merge order). Change AuthContext sync effect deps from `[loading, session]` → `[loading, session?.user?.id]` to stop pulls on every token refresh.
- **SYNC-03** Replace `_syncing` boolean guard with a serialized promise chain (`enqueueSync`). `pullAll` / `pushAll` enqueue instead of dropping.
- **SYNC-04** Foreign-character UPDATE path uses `.update(patch).eq("id",id).select("id")`; 0-row result → quarantine + `pullTable({id})` (via Phase 2 quarantine). Migration widens `characters` UPDATE policy: `USING/WITH CHECK is_host_of_player(user_id, auth.uid())`.
- **SYNC-05** Migration: `REPLICA IDENTITY FULL` and `ALTER PUBLICATION supabase_realtime ADD TABLE` for `games`, `game_players`, `characters`, `profiles`. All 5 `.subscribe()` sites take a status callback that (a) logs `CHANNEL_ERROR/TIMED_OUT/CLOSED`, (b) runs a catch-up pull on `SUBSCRIBED`.
- **SYNC-06** Rewrite `Dashboard.handleJoinGame` to use `rpc("join_game_by_code")` + `pullTable("game_players", …)` (mirror `JoinGame.tsx`). Delete phantom insert.
- **SYNC-07** Add `mergeCleanRow(table, row)` to `localStore` (no dirty marker). Replace `upsertRow` at server-response sites: `JoinGame:43`, `Dashboard:101,113`, `HostGame:212`. In `doPush`, filter out `games` rows whose `host_user_id !== _currentUserId`, mark synced, log a single sync error.
- **SYNC-08** AuthContext: only `clearAll()` when switching between two non-null distinct user ids. `signOut` runs `pushAll` first when online. Delete dead `TOKEN_REFRESHED && !newSession` branch.
- **SYNC-09** `doPull` aborts (throw) on any step error; never writes snapshots derived from errored responses; no-user branch returns early instead of overwriting `user_roles`.
- **SYNC-15** In `scenarioOverrides.ts` and `featOverrides.ts` propagate `error`; never cache failed loads. Dispatch `"overrides-change"`. On reconnect/focus, invalidate + reload. Replace frozen module maps in `WikiLinkedText.tsx`, `FeatDetailsDisplay.tsx`, `ManageFeats.tsx`, `ManageRedirects.tsx`, `WikiSectionTree.tsx`, `ManageScenarios.tsx` with a version-keyed rebuild via `useSyncExternalStore`.
- **DATA-01** In `ScenarioEditorPanel` `mergedScenarios`, fold `fr:*` into nested `fr` object (match `applyScenarioOverrides`). Gate deletion behind explicit confirm; only delete after download.

## Phase 2 — Unsticking machinery (FIX_SPEC_UNSTICK §5–6)

- **Queue metadata (§5.1)** — `ls_outbox_meta` map with `{ at, attempts, lastAttemptAt, nextAttemptAt, lastError }`. `noteEnqueued/noteAttempt/noteSynced`. Re-editing keeps `at` but clears `nextAttemptAt`.
- **Quarantine store (§5.2)** — `ls_quarantine` with full row copy, reason, error. `quarantineRow / retryQuarantined / discardQuarantined`. Capacity 100. Re-route silent-drop paths (foreign "drop", phantom `game_players` recovery, SYNC-04 0-row) through quarantine.
- **Error classification + backoff + attempt cap (§5.3)** — Terminal PG codes → quarantine on first failure; transient → backoff `30s → 30min` ±20% jitter, cap 8 attempts → quarantine.
- **Chunk isolation (§5.4)** — On chunk push failure, retry row-by-row so one poison row can't block healthy rows.
- **Instrumented fetch (§5.5)** — Wrap `fetch` in `supabase/client.ts` with per-URL timeouts (REST 30 s / auth 15 s). Emit `Date`-header EWMA (`serverClockOffsetMs`) and stale-response detection (§2.4). 90 s watchdog that aborts wedged ops and resets the chain.
- **SW cache purge (§5.6, ST-05)** — New `src/lib/swCachePurge.ts` deleting `supabase-api-cache` / `scenario-api-cache` at boot and before U4/U5. Delete the two `/rest/v1/` `runtimeCaching` entries in `vite.config.ts`. `doPull`/`pullTable` await purge (max 2 s).
- **`syncHealth.ts` (§2)** — `SyncHealth` state (`healthy | pending | degraded | stuck | wedged`), persisted at `ls_health`, `"sync-health-change"` event. 60 s tick performs: ghost scan (ST-08), orphan-identity scan (ST-07c), attempt-cap check, wedge check, retry eligibility. Reachability probe against `/auth/v1/health` replaces trust in `navigator.onLine`.
- **Push echo check (§2.2)** — After successful push chunk, `select id, updated_at` for the ids; absent → quarantine `"rls-rejected"` + pull.
- **Realtime lifecycle helper (CROSS-02)** — `src/lib/realtime.ts` `subscribeWithCatchup(...)`. Every 30 s + `visibilitychange` re-subscribe if `state !== "joined"` > 30 s.
- **Structured journal (§6.1)** — `ls_sync_journal` ring buffer (300 entries): every push/pull outcome, fetch results, health transitions, quarantines, watchdog resets, boot.
- **Boot deadlock guards (ST-04)** — Race every AuthContext gate with 8 s timeout; `initSync` races `pullAll` with 8 s then `setSyncReady(true)`.
- **Session/limbo (§2.7, ST-07b)** — Never auto-anon in `ensureSession`; surface deduped "Sign in to send your changes".
- **AUTH-01 helper** — `reassignLocalUser(oldUid, newUid)` in `localStore`; called from AuthContext when a session appears while a local-guest exists.

## Phase 3 — Repair UX (FIX_SPEC_UNSTICK §4)

- `SyncStatusPill` mounted globally in `App.tsx` alongside `<OfflineBanner />`; hidden when healthy, colored by state, absorbs the OfflineBanner spinner.
- `SyncHealthDialog` component: status line, last successful sync, pending + quarantined lists with human labels, "Repair synchronization" (U4: probe → purge → per-row push → full pull → report), "Sync now" (U5 skips purge), Advanced (Free up space, Copy/Download diagnostics, Reset local data, Restore backup). Session-limbo variant navigates to `/auth?redirect`.
- U5 nuclear reset: build loss manifest with names, mandatory backup for >1 MB, purge caches, `clearAll`, network-only re-pull, restore backup on failure; keep `ls_pre_reset_backup` for 7 days.
- Repurpose `SyncIssuesPanel` to open the same dialog.
- Add error boundary around `<Routes>` in `App.tsx`; fallback includes "Repair synchronization".
- Add `syncHealth.*` keys to `en.ts` and `fr.ts`.

## Phase 4 — P1 fixes

SYNC-10 retry scheduler + visibilitychange hook · SYNC-11 pull-before-push on reconnect · SYNC-12 push-time snapshot + games write-back via `mergeCleanRow` · SYNC-13 remove `signInAnonymously` from `ensureSession` · SYNC-14 cross-tab `storage` listener · SYNC-16 `user_roles` reuse existing row + `onConflict: "user_id,role"` · SYNC-17 CharacterSheet key init per id, guard on unsaved · SYNC-18 GMPlayerList subscribe on any hosted game · EDIT-01 add `transforms_to` to META_FIELDS · EDIT-02 delete override row on null/empty · EDIT-03 local SubfeatSlotEditor state + debounced save · EDIT-04 generator emits `normalizeScenarioId` · EDIT-05 Translations upsert error check · GAME-01 async `getOAuthToken` refresh, don't delete token row · GAME-02 propagate subfeat exhaustion fields · GAME-03 offline portrait via FileReader, no `blob:` in store · AUTH-01 wire `reassignLocalUser` + copy fix · SRV-01 GM portrait function checks `is_host_of_player`, correct HTTP codes.

## Phase 5 — P2 / P3 / Build

GAME-04..08 (GameTimer guards + wall-clock, Spotify onTrackConsumed, stale AI action re-read, GM upload folder) · EDIT-06..09 (raw options text, editor sync-on-dirty, beforeunload, nested FR fallback) · UI-01 add `feats.delete` · SRV-02..04 migrations (deleted_at filters, join_game_by_code deleted_at + resurrect, scoped host access) · P3-01..19 (require→ESM, FAQ index, timer keys, dice ref, portal, guest profile via store, tooltip hoist, AI empty-response toasts, ZIP try/catch, revoke object URLs, translations delete, join_code UNIQUE + retry, first-owner lock, WITH CHECK, validate-feat notes, public-feats hidden split, spotify proxy) · BUILD-01 `npx tsx` in `pre*` + add `tsx` dep · BUILD-02 `passWithNoTests: true` + regression tests · BUILD-03 rewrite `sync-public-api-data.ts` · SCHEMA-01 dump baseline schema.

## Phase 6 — CROSS-01 outbox (optional, after P0/P1 ship)

Persistent op-log `ls_outbox` replacing `_dirtyRows`; per-field patches for `characters.feats`; optional `rev` optimistic-concurrency column + trigger; single-write API audit. Documented as follow-up because it supersedes several point fixes and is a larger refactor.

## Verification

Per FIX_SPEC §5 checklist and FIX_SPEC_UNSTICK §6.4 acceptance tests. Add regression tests under `src/**/__tests__/` covering: dirty persistence, dirty-wins merge, serialized sync chain, 0-row echo → quarantine, chunk isolation, wedge watchdog, stale-response detection, U5 reset restore-on-failure, invariant 1 grep check. Run `npm run build` and `npx vitest run` after each phase.

## Technical notes

- Every new/changed table gets `GRANT` block per project rules; RLS re-verified against migrations.
- No user-facing use of "Supabase" / "queue" / "RLS" — copy per §4.3.
- Migrations bundled per CROSS-04 to minimize churn.
- Never violate the four data-safety invariants (never silently drop an edit; quarantine inspectable/recoverable; destructive resets show manifest + backup; repair actions restore on failure).
