

## Problem

The bottom character peek bar and the guest banner both use `fixed bottom-0` with `z-50`. The guest banner sits on top of (or overlaps) the character peek bar, making the "Select a character" button invisible or unclickable for guests.

## Fix

Two changes in `src/pages/PlayGame.tsx`:

1. **Add bottom padding when guest banner is visible** — add `pb-10` (or similar) to the peek bar so it sits above the guest banner
2. **Better approach**: Move the guest banner's z-index below the character sheet overlay (`z-50`) and give the peek bar enough bottom offset to clear the banner. Specifically:
   - In `GuestBanner.tsx`: change `z-50` to `z-30` so it never covers game UI overlays
   - In `PlayGame.tsx`: when user is a guest, add `bottom-10` (40px) instead of `bottom-0` to the peek bar so it sits above the banner
   - Also add `pb-10` extra to `<main>` for guests so quest content isn't hidden behind the stacked bars

This ensures the peek bar ("Select a character" / character name) is always visible and tappable, whether the user is a guest or not.

