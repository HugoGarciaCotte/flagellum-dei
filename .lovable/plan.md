

## Fix Dynamic Island Safe Area — Global Solution

### Problem
The `pt-[env(safe-area-inset-top)]` is applied inconsistently. The screenshot shows "Create Character" text hidden behind the Dynamic Island on the Dashboard's character creation dialog. Multiple fullscreen elements across the app are missing this padding.

### Approach
Rather than hunting individual elements, create a reusable CSS utility class and apply it systematically to every `fixed inset-0` or `fixed top-0` element that renders content at the top of the screen.

### Changes

1. **`src/index.css`** — Add a utility class:
   ```css
   .safe-top {
     padding-top: env(safe-area-inset-top);
   }
   ```

2. **`src/pages/Dashboard.tsx`** (lines 228, 280) — Add `pt-[env(safe-area-inset-top)]` to both fullscreen `DialogContent` wrappers (Create Character and Edit Character dialogs).

3. **`src/components/ui/dialog.tsx`** — The `DialogContent` component uses `fixed` positioning. For fullscreen dialogs that override to `inset-0`, the safe area must be on the content wrapper, not the base component. No change needed here — handled per-usage.

4. **`src/components/DiceRoller.tsx`** (line 180) — The fullscreen overlay is a backdrop only (centered content), so it's fine. No change needed.

5. **`src/components/OfflineBanner.tsx`** / **`src/components/GuestBanner.tsx`** — These are `fixed bottom-0`, not affected by Dynamic Island. No change needed.

6. **`src/components/GameTimer.tsx`** — `fixed bottom-6 left-6`, not affected. No change needed.

7. **`src/pages/Auth.tsx`** / **`src/pages/Install.tsx`** — These are non-fixed layout pages that scroll normally. They need top padding on their outermost container if they don't use `PageHeader`. Will add `pt-[env(safe-area-inset-top)]` to their root elements.

8. **`src/pages/ResetPassword.tsx`** — Same treatment as Auth page.

9. **`src/components/FullPageLoader.tsx`** — Check if it's fullscreen fixed; if so, add safe area padding.

### Summary of elements needing the fix
| File | Element | Fix |
|------|---------|-----|
| `Dashboard.tsx` line 228 | Create Character DialogContent | Add `pt-[env(safe-area-inset-top)]` |
| `Dashboard.tsx` line 280 | Edit Character DialogContent | Add `pt-[env(safe-area-inset-top)]` |
| `Auth.tsx` | Root container | Add `pt-[env(safe-area-inset-top)]` |
| `Install.tsx` | Root container | Add `pt-[env(safe-area-inset-top)]` |
| `ResetPassword.tsx` | Root container | Add `pt-[env(safe-area-inset-top)]` |

Already handled (no changes): `Home.tsx`, `PageHeader.tsx`, `PlayGame.tsx` overlays, `toast.tsx`, bottom-anchored banners.

