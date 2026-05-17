## Problem

On mobile (iOS/Android, browser or PWA), bottom-fixed elements stack incorrectly:

1. **Character bar overlaps the Guest banner** (visible in screenshot: "Select a character" sits behind the orange "Guest mode" banner).
2. The character bar uses hardcoded `bottom-0` / `bottom-10` classes that ignore the `useBottomOffset` hook already used by `DiceRoller`, `GameTimer`, `SpotifyPlayer`.
3. Banners don't respect `env(safe-area-inset-bottom)`, so on iOS notch / Android gesture bar they get clipped or float oddly when installed as a PWA.
4. `useBottomOffset` returns a fixed `40px` per banner — but the real rendered height (with padding, multi-line text in French, safe-area inset) is larger, so even floats that DO use the hook can still overlap.

## Goal

A single source of truth for bottom-stack heights that:
- Works identically in browser tab, iOS Safari, Android Chrome, and installed PWA.
- Accounts for `safe-area-inset-bottom` exactly once (on the bottom-most element only).
- Reacts to runtime changes (banner appears/disappears, text wraps to 2 lines, orientation change).
- Doesn't require manually-tuned magic numbers per component.

## Approach: measured stack via context

Replace the fixed-pixel `useBottomOffset` with a real measurement.

### New: `src/contexts/BottomStackContext.tsx`
- Provides `bottomStackHeight: number` (measured px of all banners stacked at the viewport bottom, including their safe-area padding).
- Provides `registerBottomLayer(id, ref)` so each fixed banner registers its DOM node.
- Internally uses a `ResizeObserver` on registered nodes + `window.visualViewport` resize listener to recompute on rotate / keyboard / safe-area changes.
- Wrap the app in `<BottomStackProvider>` in `App.tsx`.

### `src/components/OfflineBanner.tsx` (offline state only)
- Add `pb-[env(safe-area-inset-bottom)]` to the offline bar so it hugs the gesture area.
- Register its ref with the context when visible.
- The small `bottom-4 left-4` syncing/justSynced pills already float above the stack — leave those alone, they're not blocking content.

### `src/components/GuestBanner.tsx`
- Replace inline `style={{ bottom: online ? 0 : 40 }}` with `style={{ bottom: offlineBannerHeight }}` from context.
- Add `pb-[env(safe-area-inset-bottom)]` only when this is the bottom-most layer (i.e. when `OfflineBanner` is not rendered — when `online === true`).
- Register its ref with the context.

### `src/hooks/useBottomOffset.ts`
- Reduce to a thin shim that returns `useBottomStack().bottomStackHeight` so existing consumers (`DiceRoller`, `GameTimer`, `SpotifyPlayer`) keep working with the new accurate value.
- Delete the hardcoded `BANNER_HEIGHT = 40`.

### `src/pages/PlayGame.tsx`
- Character bar (lines 180–196): replace `${isGuest ? "bottom-10" : "bottom-0"}` with `style={{ bottom: bottomStackHeight }}` and add `pb-[env(safe-area-inset-bottom)]` only when `bottomStackHeight === 0` (i.e. no banners below it — the bar itself becomes the bottom layer).
- Bottom-padding `pb-32` / `pb-24` on the inner `<main>` should be replaced with dynamic `paddingBottom: bottomStackHeight + characterBarHeight + 16` so scroll content doesn't hide behind the bar+banners. Use a ref on the character bar measured into the same context (or a local ref + ResizeObserver).

### PWA / offline awareness
- When installed as PWA, `display-mode: standalone` removes the browser chrome — safe-area inset becomes more pronounced on iOS. The measured approach handles this automatically because it reads computed layout, not media queries.
- Offline: the OfflineBanner appears → its registered height pushes GuestBanner up → which pushes the character bar up. All transitions are observed live; nothing is hardcoded.
- The retry-pending-publish `pending_sync` badge on `HostGame` is unchanged.

## Files touched

- `src/contexts/BottomStackContext.tsx` (new)
- `src/App.tsx` (wrap provider)
- `src/components/OfflineBanner.tsx`
- `src/components/GuestBanner.tsx`
- `src/hooks/useBottomOffset.ts` (rewrite as shim)
- `src/pages/PlayGame.tsx`

## Out of scope

- Dashboard / Home / Admin pages — they don't have bottom-floating game UI.
- Restyling the banners visually — only positioning logic changes.
- The "Install as app" link (already removed from in-game views in the previous turn; the faint text in the screenshot was a stale screenshot).
