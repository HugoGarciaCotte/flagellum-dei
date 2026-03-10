

## Audit: Guest Mode + Dead Server Resilience

### Critical Blocker Found

**The "Continue as Guest" flow requires a live server and will completely fail if the server is dead.**

In `Auth.tsx` line 142, clicking "Explore as Guest" calls `enterGuestMode()` which calls `supabase.auth.signInAnonymously()`. This is a server call. If the server is dead:

1. Anonymous sign-in fails
2. No session is created
3. `user` remains `null`
4. The Index page shows the Home landing page instead of Dashboard
5. The user is completely locked out of all features

This is the **single biggest gap** preventing "99% offline" play when the server is dead.

### Everything Else Is Solid

Once a user has a session (guest or authenticated), everything works well offline:

| Feature | Server Dead? | Status |
|---|---|---|
| **Getting past auth** | Fails if no prior session | **BROKEN** |
| Dashboard (with cached session) | Works | OK |
| Character creation | Works (offline queue) | OK |
| Character editing | Works (offline queue) | OK |
| Character deletion | Works (offline queue) | OK |
| Feat browsing/selection | Works (local data) | OK |
| Become GM | Works (localStorage + queue) | OK |
| Host a game | Works (local game) | OK |
| Play a game (cached) | Works | OK |
| Dice roller | Works (broadcast fails silently) | OK |
| Game timer | Works (client-side) | OK |
| Join a game | Blocked with clear message | OK |
| AI portrait/description | Blocked with clear message | OK |
| Portrait upload | Blocked with clear message | OK |

### The Fix

Add a **local-only guest mode** fallback in `AuthContext.tsx`. If `signInAnonymously()` fails (server dead), create a synthetic local session stored in `localStorage`. This gives the user a fake `user` object with a UUID so all the offline machinery works.

| File | Change |
|---|---|
| `src/contexts/AuthContext.tsx` | In `enterGuestMode`, catch the error from `signInAnonymously()`. On failure, generate a local UUID, store it in `localStorage` as a synthetic guest session, and set a local-only user object with `is_anonymous: true`. Add `useEffect` on mount to restore any saved local guest session. |
| `src/pages/Auth.tsx` | No changes needed — `enterGuestMode` already handles navigation. |

The synthetic user object needs: `id` (UUID), `is_anonymous: true`. All existing code checks `user?.id` and `user?.is_anonymous` — both will work with this object.

When the server comes back online, the local guest can either:
- Continue using cached data (queue syncs when auth is restored)
- Sign up for a real account

One caveat: queued mutations will fail to sync until the user gets a real auth session, but that's acceptable — the data stays in the queue and can be retried.

### Minor: Unused import in CharacterSheet.tsx

Line 3 imports `useQuery` from `@tanstack/react-query` but only uses `useMutation` and `useQueryClient`. Should be cleaned up.

