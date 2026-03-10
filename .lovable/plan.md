

## Guest Mode

Add a client-side-only "guest mode" that bypasses authentication entirely. All data lives in localStorage — nothing touches the backend. A persistent banner reminds guests their data is local-only, with a CTA to sign up.

### Architecture

**AuthContext** gets two new fields:
- `isGuest: boolean`
- `enterGuestMode: () => void`

When `enterGuestMode()` is called, it sets a `isGuest` flag in state (and `localStorage` so it survives refresh), plus creates a fake `User`-like object with a stable random UUID (stored in localStorage as `guest_user_id`). This fake user object has `id`, `email: "guest"`, etc. The `signOut` function clears guest state too.

**Key principle**: The existing offline infrastructure (localStorage queue, `useOfflineQuery` cache, optimistic updates) already handles local-only operation perfectly. Guest mode simply forces the app to always behave as if offline for Supabase calls, while the UI remains fully functional.

### Changes

**1. `src/contexts/AuthContext.tsx`**
- Add `isGuest` and `enterGuestMode` to context type and provider.
- `enterGuestMode()`: generate/retrieve a stable `guest_user_id` from localStorage, create a minimal user-shaped object, set it as the "user" in state with `isGuest = true`.
- `signOut`: if guest, clear `guest_user_id` from localStorage, reset state.
- Expose `isGuest` so consumers can check.

**2. `src/pages/Auth.tsx`**
- Below the login form's "Forgot your password?" link, add a divider and a "Explore as Guest" button that calls `enterGuestMode()` then navigates to `/`.

**3. `src/components/GuestBanner.tsx`** (new)
- A fixed bottom banner (similar to OfflineBanner) with amber/warning styling.
- Text: "Guest mode — your data is saved locally only"
- Includes a "Sign up to save online" link pointing to `/auth`.

**4. `src/App.tsx`**
- Render `<GuestBanner />` alongside `<OfflineBanner />`.

**5. `src/pages/Dashboard.tsx`**
- When `isGuest`, the header shows "Sign Up" instead of "Sign Out".
- When `isGuest`, all Supabase queries are skipped (the `useOfflineQuery` hook already caches locally; we just need `enabled: false` for guest).
- The "Become a Game Master" button works immediately (local flag) without Supabase insert.
- Join game: allow entering a code but show toast that it's local-only.

**6. `src/hooks/useIsGameMaster.ts` and `src/hooks/useIsOwner.ts`**
- When `isGuest`, skip the Supabase query. For game master, check a localStorage flag instead. Owner is always false for guests.

**7. Dashboard / Game pages query guards**
- Anywhere `enabled: !!user` is used with Supabase queries, add `&& !isGuest` so no backend calls are made. The offline query cache handles the rest.

### Guest Banner Design
```text
┌─────────────────────────────────────────────────────┐
│ 👤 Guest mode — data saved locally only  [Sign up →]│
└─────────────────────────────────────────────────────┘
```
Amber background, fixed to bottom, similar z-index to OfflineBanner. When both banners would show, guest banner takes priority (offline banner is redundant for guests).

### Data Flow
- Character creation → goes to localStorage via existing offline queue path
- Game creation → localStorage with temp IDs (existing offline path)
- Join game → localStorage only, no actual server join
- Feats/scenarios → already hardcoded locally, no change needed
- If guest later signs up → data is NOT migrated (too complex; banner makes this clear)

