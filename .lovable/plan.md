

## Fix Safe Area Handling for iOS PWA

### Problem
Two issues:
1. The **Home page** header uses `fixed top-0` with no safe-area padding — content sits behind the Dynamic Island.
2. The **body** has `padding-top: env(safe-area-inset-top)` which creates a visible gap below sticky/fixed headers when scrolling — looks silly in PWA mode because the padding is on the body while headers already handle their own safe-area padding.

### Approach
Remove the body-level `padding-top` for the safe area inset and instead handle it per-element (headers, fixed overlays). This prevents double-padding and keeps things clean.

### Changes

1. **`src/index.css`** — Remove `padding-top: env(safe-area-inset-top)` from `body`. Keep the other insets (bottom, left, right).

2. **`src/pages/Home.tsx`** — Add `pt-[env(safe-area-inset-top)]` to the fixed header (line 220) so the logo and Play button sit below the Dynamic Island.

3. **`src/pages/Home.tsx`** — The hero section `pt-20` may need a slight bump to account for the taller header, but since the header now includes its own safe-area padding this should flow naturally.

4. **`src/components/PageHeader.tsx`** — Already has `pt-[env(safe-area-inset-top)]` from previous fix. No change needed.

5. **`src/pages/PlayGame.tsx`** — Already has safe-area padding on fixed overlays. No change needed.

This ensures every fixed/sticky element handles its own safe area, and the body doesn't add a redundant gap.

