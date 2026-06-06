## Problem

After signing in as `hugo@garcia-cotte.com`, the `/admin` page flashes "Access denied" even though Hugo has the `owner` role in the database.

Root cause: in `AuthContext`, `syncReady` is set to `true` on the initial pre-login pass (no user → nothing to pull). When the session then changes to Hugo, the effect re-runs and starts `pullAll(hugo)`, but `syncReady` stays `true` from the previous pass for the whole duration of the pull. `useIsOwner` therefore reports "ready, no roles" and `Admin.tsx` renders "Access denied" before the role row lands in `localStorage`.

## Fix

In `src/contexts/AuthContext.tsx`, reset `syncReady` to `false` at the start of the sync effect, before `pullAll`, whenever the effective user id changes. Only flip it back to `true` once the pull resolves (success or failure).

Also, when the user id changes from one authenticated user to another (e.g. previous local guest → Hugo) without a `signOut` in between, call `clearAll()` so the new user never reads the previous user's stale rows.

## Files to touch

- `src/contexts/AuthContext.tsx` — track the last synced user id; on change, `setSyncReady(false)`, optionally `clearAll()` if switching between distinct authenticated users, then run `pullAll` and set `syncReady` true.

No DB, RLS, or other component changes needed. `useIsOwner` already gates on `syncReady` from the previous fix.

## Verification

1. Sign out fully.
2. Sign in as `hugo@garcia-cotte.com`.
3. Navigate to `/admin`. Expected: loader shows until pull completes, then the Admin dashboard renders (no "Access denied" flash).
4. Sign out, sign in as a non-owner. `/admin` should show "Access denied" after the loader.
