

## Hide Language Picker on Most Screens

**What**: The `LanguagePicker` globe icon should only appear on the homepage (`/` when not logged in → `Home`) and the dashboard (`/` when logged in → `Dashboard`). On all other routes (auth, game, admin, etc.) it should be hidden.

**How**: Update `LanguagePicker` to use `useLocation()` from react-router-dom. Only render when `pathname === "/"`. Since `Index` serves both Home and Dashboard at `/`, this single check covers both cases.

**File**: `src/components/LanguagePicker.tsx`
- Import `useLocation` from `react-router-dom`
- Add `const { pathname } = useLocation();`
- Early return `null` if `pathname !== "/"`

