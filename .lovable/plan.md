

## Fix Dynamic Island overlap on iOS

### Problem
The `PageHeader` uses `sticky top-0`, which pins it to the viewport top. With `viewport-fit=cover` in the meta tag, content extends behind the Dynamic Island/notch. The body has `padding-top: env(safe-area-inset-top)` which pushes initial content down, but once you scroll, the sticky header slides under the Dynamic Island.

Additionally, several `fixed` elements across the app (PlayGame overlays, toasts, GameTimer) may also be affected.

### Changes

1. **`src/index.css`** — Add a CSS custom property and a utility class for safe-area top padding:
   ```css
   :root {
     --sat: env(safe-area-inset-top);
   }
   ```

2. **`src/components/PageHeader.tsx`** — Change `sticky top-0` to use the safe area inset:
   ```
   style={{ top: 'env(safe-area-inset-top)' }}
   ```
   And add `pt-[env(safe-area-inset-top)]` with a background that extends behind the notch area. The cleanest approach: wrap with an outer div that has the safe-area padding and background, or use inline style `top: env(safe-area-inset-top)` plus padding-top on the header itself so the background covers the Dynamic Island area.

   Specifically: keep `sticky top-0` but add `pt-[env(safe-area-inset-top)]` so the header's background fills behind the Dynamic Island while content sits below it.

3. **`src/pages/PlayGame.tsx`** — Add safe-area-inset-top padding to `fixed inset-0` fullscreen overlays (character overlay, create/edit character panels) so their top toolbars aren't hidden.

4. **`src/components/ui/toast.tsx`** — Add safe-area top padding to the toast viewport on mobile so toasts don't appear behind the Dynamic Island.

These are small CSS additions — no logic changes needed.

