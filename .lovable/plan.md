## Root cause

Sheethal's browser was holding a Supabase session token whose server-side session had already been deleted (likely revoked by the earlier logout). The SDK kept the local tokens, `onAuthStateChange` never fired, and every server-side `auth.getUser()` returned 403 `session_not_found` — including the one inside `generate-character-portrait`, which then bailed at line 26 with `Unauthorized`.

## Fix

Detect dead sessions client-side and recover automatically, plus surface a clean error on the portrait button instead of a silent failure.

### 1. `src/contexts/AuthContext.tsx` — auto-recover stale sessions

- After `getSession()` resolves, if a session exists, call `supabase.auth.getUser()` to verify it server-side.
- If it returns a `session_not_found` / 403 / `AuthSessionMissingError`, call `supabase.auth.signOut({ scope: 'local' })`, clear `session`, show a sonner toast "Session expired — please sign in again".
- In `onAuthStateChange`, also treat `TOKEN_REFRESHED` with `session === null` as a stale-session signal and run the same cleanup.
- Export a helper `ensureFreshSession()` from the context (does the same `getUser()` probe on demand) so callers can use it before invoking edge functions.

### 2. `src/components/CharacterSheet.tsx` — pre-flight + 401 handling

Before calling `generate-character-portrait`:
- `await ensureFreshSession()`; if it returns null, show toast "Please sign in to generate a portrait" and abort.
- If the invoke returns 401, run the same recovery (sign out locally, toast).

### 3. `src/components/CharacterCreationWizard.tsx` — same guard for preview

`generate-portrait-preview` itself doesn't require auth, so just keep the existing error toast — no change beyond a clearer message if 401 ever comes back.

### 4. `supabase/functions/generate-character-portrait/index.ts` — clearer 401 body

Return `{ error: "Session expired", code: "session_expired" }` on the unauthorized branch so the client can branch reliably.

## Out of scope

- No changes to AI prompt, storage upload, character schema, RLS, or any unrelated edge function.
- No UI redesign — only toasts + auto sign-out on detected stale session.

## Expected behaviour after fix

Next time Sheethal (or any user) lands with a dead session, the app detects it on load, signs her out cleanly, and prompts re-login. After signing in again, portrait generation works.