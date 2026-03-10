

## Plan: Refactor Guest Mode to Use Anonymous Authentication

### Summary
Replace the current fake-local-user guest system with Supabase anonymous sign-in. Guests get a real database session, so all operations (characters, hosting, joining) work through normal DB paths when online. The only thing that requires being online is joining a game. Offline fallback still works for everything else.

### Prerequisites (manual step)
You need to enable anonymous sign-ins in your project settings: go to **Settings → Users → Auth settings → General settings** and enable "Allow anonymous users."

### Architecture Change

```text
BEFORE:
  Guest → fake local UUID → all DB ops queued/cached locally
  → can never use real DB

AFTER:
  Guest → signInAnonymously() → real auth session (is_anonymous=true)
  → normal DB access when online, offline queue when offline
  → "Sign Up" converts anonymous → permanent via updateUser()
```

### Changes

**1. `src/contexts/AuthContext.tsx`** — Replace fake guest with anonymous auth

- `enterGuestMode()`: call `supabase.auth.signInAnonymously()`. If offline, fall back to current local-only behavior.
- `isGuest`: derived from `session?.user?.is_anonymous === true` OR local fallback mode.
- `signOut` for anonymous users: call `supabase.auth.signOut()` (destroys the anonymous session).
- Keep local fallback for truly offline-first entry (no network at all).

**2. `src/pages/Auth.tsx`** — Convert anonymous → permanent account

- When the user is already an anonymous guest and fills out the signup form, call `supabase.auth.updateUser({ email, password, data: { display_name } })` instead of `signUp()`.
- This links the anonymous account to a real one, preserving all data (characters, game_players, feats).
- After conversion, create/update the profile record with the display name.

**3. `src/pages/Dashboard.tsx`** — Simplify guest branches

- Remove the `isGuest` special case from `handleCreateGame` — anonymous users have real auth, so they can insert games normally when online. Keep the `!online` branch for offline.
- Remove the `isGuest` special case from `handleJoinGame` — anonymous users join games via normal DB insert (look up game by join code, insert into `game_players`).
- Remove `isGuest` from query `enabled` flags — anonymous users can query the DB.

**4. `src/pages/HostGame.tsx`** — Remove guest-specific query disabling

- Revert `effectivelyOffline` to just `!online` (remove `isGuest` from it).
- Anonymous users have real sessions, so queries work normally.

**5. `src/pages/PlayGame.tsx`** — Same simplification

- Remove guest-specific offline handling. Anonymous auth means normal DB access.

**6. `src/components/CharacterSheet.tsx`** — Simplify

- `effectivelyOffline` back to just `!online`. Anonymous users can save to DB when online.

**7. `src/components/CharacterCreationWizard.tsx`** — Simplify

- Remove `isGuest` from the offline/guest branches. Characters are created in the real DB for anonymous users when online.

**8. `src/components/CharacterFeatPicker.tsx`** — Same pattern

- Remove guest-specific offline workarounds.

**9. `src/components/GuestBanner.tsx`** — Update messaging

- Still shown when `isGuest` (anonymous). Update text to "Guest mode — sign up to keep your progress permanently."

**10. Database: Profile handling for anonymous users**

- The existing `handle_new_user` trigger creates a profile on signup. For anonymous users, it will fire with no email/display_name. Update the trigger (via migration) to set display_name to `'Guest'` when `raw_user_meta_data->>'display_name'` is null and `is_anonymous` is true.
- When converting anonymous → permanent, update the profile's display_name.

**11. RLS policy review**

- Current policies use `auth.uid()` checks. These work identically for anonymous users since they have a real `auth.uid()`. No RLS changes needed.
- Anonymous users get the `authenticated` role, same as permanent users.

### What stays the same
- Offline queue system (used when `!online` regardless of guest status)
- Game session caching for offline play
- All existing RLS policies (anonymous users have real auth.uid())

### Migration needed
- Update `handle_new_user()` trigger to handle anonymous user profile creation gracefully.

