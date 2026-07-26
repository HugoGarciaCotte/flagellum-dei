
# FIX_SPEC_V2 — Full Remediation Plan

Scope: 19 Section-A regressions (previous fixes that were wrong/missing), 25 Section-B new bugs, plus the C-2 verification tests. Executed in strict severity order so P0/P1 land first even if later phases are interrupted.

## Phase 1 — P0 data-loss and dead flows (A-01, A-02, A-03, B-01)

- **A-01** `src/contexts/AuthContext.tsx`: add `userId &&` to the clear guard. Extract `shouldClearOnUserChange(prev, next)` into `src/lib/localStore.ts` (pure, unit-tested).
- **A-02** `AuthContext.signOut`: `await pushAll()` (best-effort) before `supabase.auth.signOut()`; delete the dead `TOKEN_REFRESHED && !newSession` branch.
- **A-03** `src/pages/Dashboard.tsx` `handleJoinGame`: replace direct SELECT + phantom `upsertRow` with the `join_game_by_code` RPC + `pullTable("game_players", { game_id, user_id })`, using `mergeCleanRow` for the games write-back. Add phantom-cleanup effect in `PlayGame.tsx` preferring the non-dirty row and `deleteRow`-ing duplicates.
- **B-01** `src/lib/syncManager.ts`:
  - `scheduleRetry` timer: skip `pushAll` when `!navigator.onLine`, re-arm.
  - New `src/lib/reachability.ts` probing `/auth/v1/health` with 5s abort, cached 60s.
  - `handleRowFailure`: connectivity failures (`TypeError`, `TimeoutError`, `/failed to fetch|load failed|network/i`) call a new `noteDeferred` (nextAttemptAt only, no `attempts++`, no quarantine). Only count an attempt when the reachability probe recently succeeded.
  - `pushChunk` catch: don't per-row-penalize on thrown network errors; just `scheduleRetry`.

## Phase 2 — P1 correctness (A-04..A-08, B-02..B-04)

- **A-04** `CharacterSheet.tsx`: split the sync effect — one initializer keyed on `characterId`, one guarded by `!dirty` keyed on row fields.
- **A-05** `GMPlayerList.tsx`: subscribe when `games.length > 0` (not `playerUserIds.length`), key on `gameIdsKey`, read games via `getBy` inside handlers, and pull characters/profiles for new members. Same guard on initial-pull effect.
- **A-06** New `src/lib/realtime.ts` `subscribeWithCatchup(name, bindings, onCatchup)` handling `SUBSCRIBED`/`CHANNEL_ERROR`/`TIMED_OUT`. Migrate 5 call sites: `HostGame.tsx` (3), `PlayGame.tsx`, `GMPlayerList.tsx`.
- **A-07** Add `feats.delete` to `src/i18n/en.ts` and `src/i18n/fr.ts`.
- **A-08** `generate-character-portrait/index.ts`: allow hosts via `is_host_of_player` RPC (service-role); 403/404 instead of 500. `CharacterSheet.tsx`: hide Upload when `mode === "gm"`.
- **B-02** `Dashboard.tsx` guest header button: just `navigate("/auth")` — no `signOut()`.
- **B-03** `syncManager.ts`: generation-based watchdog. Ops orphaned by a reset skip their `_syncDepth--`/notify in `finally`.
- **B-04** `localStore.ts` cross-tab: on `clearDirtyFor`/`quarantineRow` write a `ls_dirty_cleared` tombstone `{keys, at}`. Storage listener handles that key: remove marker unless local `_outboxMeta.get(k)?.at > tombstone.at`. Apply union-with-removal to `OUTBOX_META_KEY` too.

## Phase 3 — P2 correctness (A-09..A-14, B-05..B-12)

- **A-09** `supabase/functions/_shared/auth.ts`: `.is("deleted_at", null)` in the roles query.
- **A-10** `GameTimer.tsx`: guard `!hasAmbiance` in expanded branch → collapse and return null. Add top-level `ErrorBoundary` in `src/App.tsx` wrapping `<Routes>`, fallback offers Reload + mounts `SyncIssuesPanel`.
- **A-11** `GameTimer.tsx`: wall-clock timer via `startedAtRef = Date.now() - elapsed*1000`; recompute on `visibilitychange`.
- **A-12** `package.json`: replace `bunx tsx` with `npx tsx` in `predev`/`prebuild`; add `tsx` to `devDependencies`.
- **A-13** Replace remaining `upsertRow` server-response writes with `mergeCleanRow` at `Dashboard.tsx:101`, `JoinGame.tsx:43`, `HostGame.tsx:212`.
- **A-14** `HostGame.tsx`: add `.catch` on `loadScenarioOverrides` (or delete dead state). Add `useOverridesVersion()` hook (see B-05) and consume it in the scenario memo.
- **A-19 minimum** Global mount of `<SyncIssuesPanel />` as a floating pill in `App.tsx` (visible when pending+errors+quarantine > 0). New `src/lib/syncHealth.ts` with a 60s ghost scan + attempt-cap sweep.
- **B-05** `scenarioOverrides.ts` / `featOverrides.ts`: add `refreshOverrides()` that swaps `_overrides` only on success (no null window); add generation guard. `syncManager.doPull` uses `refresh*` instead of `invalidate + load`. `useOverridesVersion()` via `useSyncExternalStore` on `overrides-change`; consumed in `HostGame`, `PlayGame`, wiki/feat memos.
- **B-06** `Dashboard.handleCreateGame`: retry ≤3× on `23505` join_code collision (regen code); toast destructive on other online errors; keep offline path.
- **B-07** `syncManager.doPush`: when `normalizeScenarioId(r.scenario_id) !== r.scenario_id`, `mergeCleanRow("games", { id, scenario_id: normalized })` before sanitizing so snapshot equals stored row.
- **B-08** `syncManager.ensureSession`: rate-limit "Not signed in" emission once per session and skip for `LOCAL_GUEST_KEY`. `GuestBanner` renders "Sign in to send your {n} pending changes" when dirty>0. `OfflineBanner` ignores `detail.table === "session"`.
- **B-09** i18n the entire `SyncIssuesPanel`; replace `window.confirm` with `AlertDialog`; add per-entry "Download" (JSON via `downloadFile.ts`). New `sync.*` key group in en/fr.
- **B-10** `OfflineBanner`: new `common.syncFailed` key EN+FR, use `.replace('{table}',…).replace('{message}',…)`.
- **B-11** `CharacterSheet`: `character.toast.signInForPortrait` + `character.toast.sessionExpired` keys.
- **B-12** `vite.config.ts` storage route → `StaleWhileRevalidate`. Ensure `generate-character-portrait` returns `publicUrl + "?t=" + Date.now()`; wizard upload mirrors `handleUpload`.

## Phase 4 — P3 polish (A-15..A-19, B-13..B-25)

- **A-15** `GameTimer` reset compare via `JSON.stringify`; don't force `running` on if user paused.
- **A-16** `spotify-token-exchange`: for `refresh_token` grant, ignore client-supplied token, look up caller's row via service-role, always update `access_token`/`expires_at`; only update `refresh_token` if returned.
- **A-17** Call `evictStaleGames(userId)` after successful `pullAll`; also clear markers/outbox for evicted `game_players` rows.
- **A-18** `syncManager.pullTable`/`pullAll` catch: `store.appendSyncError(...)` in addition to `emitSyncError`.
- **B-13** Terminal + max-attempts branches: if `quarantineRow` returns false, `noteAttempt` with backoff instead of leaving row hot.
- **B-14** `deleteBy`: mirror `deleteRow`'s marker/outbox cleanup for every removed id. Test.
- **B-15** `clearAll`: also clear `SYNC_ERRORS_KEY` and `QUARANTINE_KEY`; keep journal.
- **B-16** `GMPlayerList`: drop `if (chars.length === 0) continue`; `currentChar = chars[0] ?? null`.
- **B-17** `PlayGame`: either delete dead `sectionTitle` derivation or render it (choose render — show title inside `<main>` when `currentSectionId` set).
- **B-18** `Dashboard` Active Games memo deps: add `locale`, `t`, and `useOverridesVersion()`.
- **B-19** Remove `.neq("status","ended")` on played games pull; `evictStaleGames` handles cleanup.
- **B-20** `HostGame`/`PlayGame`: `lookupDone` state; when `syncReady && lookupDone && !game`, render "Game not found" card with Back-to-Dashboard.
- **B-21** Wrap `HostGame.endGame` in `AlertDialog`; add `game.endConfirmTitle`/`game.endConfirmBody` EN+FR.
- **B-22** `syncManager` user_roles push: drop `ignoreDuplicates`; keep `onConflict: "user_id,role"`.
- **B-23** `I18nContext`: try/catch localStorage; clear stale dbOverrides synchronously on `setLocale`. `LanguagePicker` — keep current guard (confirm intent). FR fixes: fr.ts 62/84/27-28 (unify "Talents"), remove dead `gm.editCharacter`, i18n `aria-label`s in `GameTimer`/`PlayGame`/`LanguagePicker`.
- **B-24** Handled by B-05 generation guard; ensure both override modules include it.
- **B-25** `AuthContext` after `reassignLocalUser`: call `triggerPush()`. In `initSync`, if `getDirtyRows().length > 0`, `pushAll()` at end.

## Phase 5 — Tests & verification (Section C)

Add vitest coverage in `src/lib/localStore.test.ts` (extend) and new files:

- `shouldClearOnUserChange` truth table (A-01)
- `handleRowFailure` "Failed to fetch" ×20 → no attempts, no quarantine (B-01)
- `scheduleRetry` offline → no `pushAll` (B-01)
- Watchdog generation orphan test (B-03)
- `ls_dirty_cleared` tombstone semantics (B-04)
- `refreshOverrides` non-destructive + stale-gen guard (B-05/B-24)
- `doPush` legacy-scenario-id clears dirty (B-07)
- `deleteBy` ghost cleanup (B-14)
- `clearAll` clears errors + quarantine (B-15)
- Quarantine-full terminal → noteAttempt backoff (B-13)
- RTL: `CharacterSheet` keeps typed input across `mergeCleanRow` (A-04)

Final checks: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` (no Bun).

## Notes / deferrals

- Section C-4 re-verification debt (GAME-01/02/03/06/07, EDIT-03..09, SCHEMA-01, DATA-01 confirm dialog) will be spot-audited in Phase 4; adding an explicit confirm dialog around `ScenarioEditorPanel`'s destructive delete-all is included.
- Full FIX_SPEC_UNSTICK §2 (health, echo, telemetry, U5 nuclear reset, diagnostics bundle) is out of scope beyond the "minimum viable" items in A-19; they can follow in a dedicated pass.
