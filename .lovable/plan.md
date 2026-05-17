## Goal

When a hosted game exists only in local storage (DB insert failed or user is offline), don't show the join code — show a clearly warning-styled retry button in its place. Once the game lands in the DB, the normal code chip appears. **Offline solo hosting keeps working exactly as today.**

## Behavior

- Right after clicking "Host", the local game gets a `pending_sync: true` flag.
- On the host page header, where the `[Join code: DNYYWP 📋]` chip lives:
  - `pending_sync === true` → render the retry button (no code shown, nothing to copy/share).
  - Otherwise → render the existing code chip exactly as today.
- The retry button:
  - Label (FR): `⚠ Non publié — Réessayer` / (EN): `⚠ Not published — Retry`
  - Style: `variant="outline"` with destructive/amber border + destructive text, same height as the code chip so the header doesn't jump.
  - Tooltip: "This quest exists only on your device. Players can't join until it's published."
  - Click → re-attempt the DB insert (using the existing local UUID so no id swap is needed). 
    - Success → clear `pending_sync`, toast "Quest published — share the code", chip flips back to the normal code display.
    - Failure → keep button, toast the real error (network / RLS / auth) so the user knows *why*.
    - While retrying: button disabled, label shows spinner + "Publishing…".

## Offline mode — what must NOT break

The app is local-first and explicitly supports offline solo play. This change must preserve that:

1. **Creating a game offline still succeeds.** `handleCreateGame` already writes to localStorage first and only *attempts* the DB insert. We keep that order. If the insert throws (offline → fetch error) we catch it, mark `pending_sync: true`, and continue navigating to `/game/:id/host`. No blocking error, no broken flow.
2. **Hosting and playing offline still works.** `pending_sync` only hides the *join code chip* and replaces it with the retry button. Quest navigation, character sheets, dice, notes, scenario rendering — none of them gate on `pending_sync`. A solo offline host gets the full experience minus the (useless-while-offline) shareable code.
3. **Retry button is offline-aware.** Before firing the insert it checks `navigator.onLine`; if false, the toast says "You're offline — players can join once you reconnect" and skips the network call (avoids a misleading network-error toast).
4. **Auto-heal on reconnect.** Add a one-time `window.addEventListener('online', …)` in HostGame that retries the publish silently when connectivity returns, so the user doesn't have to click the button manually after a brief drop.
5. **No new required fields, no schema changes.** `pending_sync` lives only in the local row; it is never sent to Postgres (the insert/upsert payload still lists exactly the existing `games` columns). Removing/clearing it is a pure local mutation — sync code path is untouched.
6. **`syncManager` debounced push stays as-is.** It already upserts `games`; if it happens to succeed before the user clicks retry, we also clear `pending_sync` in a small post-push hook so the UI catches up without a manual click.

## Technical changes

1. `src/pages/Dashboard.tsx` — `handleCreateGame`:
   - Pass the local UUID as explicit `id` to `supabase.from("games").insert({ id: tempGameId, ... })`. The local id becomes the real id from the start → no id-swap, URL stays valid whether DB lands now or later.
   - On insert failure or thrown error (including offline): set `pending_sync: true` on the local row, then navigate as usual. Never block.
   - On insert success: ensure `pending_sync` is absent/false.

2. `src/pages/HostGame.tsx`:
   - Replace the single code `<Button>` in `rightActions` with a conditional render based on `game.pending_sync`.
   - Add `retrying` state + `handleRetry`: guard on `navigator.onLine`, then `supabase.from("games").upsert({ id, host_user_id, scenario_id, join_code, status, current_section })`, clear `pending_sync` on success, toast error otherwise.
   - Add `online` event listener that calls `handleRetry` silently (no toast on still-failing) when the user comes back online.

3. `src/lib/syncManager.ts` (tiny addition): after a successful `games` upsert in `pushAll`, if the local row has `pending_sync`, clear it. Keeps the UI in sync when the debounced push wins the race.

4. `src/i18n/en.ts` + `src/i18n/fr.ts`: add
   - `game.notPublished` → `Not published` / `Non publié`
   - `game.retry` → `Retry` / `Réessayer`
   - `game.publishing` → `Publishing…` / `Publication…`
   - `game.notPublishedHint` → `This quest exists only on your device. Players can't join until it's published.` / `Cette quête n'existe que sur votre appareil. Les joueurs ne peuvent pas la rejoindre tant qu'elle n'est pas publiée.`
   - `game.publishedToast` → `Quest published — share the code.` / `Quête publiée — partagez le code.`
   - `game.offlineRetry` → `You're offline — players can join once you reconnect.` / `Hors ligne — les joueurs pourront rejoindre dès la reconnexion.`

## Out of scope

- Join flow, RLS, schema, and the silent debounced sync loop all stay untouched.
- No change to how scenarios/characters/feats sync — only the `games` row gets the `pending_sync` flag.
