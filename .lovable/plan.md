## Problem

In `PlayGame`, the bottom character bar renders the full `CharacterListItem` Card — which includes the description and the entire feats list — so even when "collapsed" it can take half the screen. And the expanded view is a fullscreen overlay (`inset-0`), so there is no "outside" to click.

## Fix (UI only, in `src/pages/PlayGame.tsx`)

### 1. Make the collapsed bar truly compact
Replace the embedded `CharacterListItem` in the collapsed bar with a single-row summary: small avatar + character name on one line, plus a chevron button on the right.
- Height ≈ 48–56 px (fits one line + safe-area padding).
- Tapping the row OR the chevron expands it.

### 2. Add an explicit toggle chevron
Top-right of the bar: a `ChevronUp` button when collapsed, `ChevronDown` when expanded. Replaces the current `GripHorizontal` cue with something obviously interactive.

### 3. Convert the expanded view from fullscreen to a bottom sheet
Currently expanded is `fixed inset-0 z-50 bg-background`. Change it to:
- A bottom sheet pinned to the bottom, max-height ~ `min(70vh, 560px)`, rounded top corners, slide-in-from-bottom (keep existing animation).
- A semi-transparent backdrop above it (`fixed inset-0 z-40 bg-black/40`) that, when clicked, collapses the sheet.
- Keep the `X` close button in the sheet header for accessibility, and add the chevron-down toggle next to it.
- Internal `ScrollArea` already handles long lists.

### 4. Bottom-stack integration
The collapsed bar still registers its height with the existing `BottomStackContext` / `bottomOffset` logic so the offline + guest banners stack correctly above it. The expanded bottom-sheet sits above all banners (z-50) and ignores the stack while open.

## Out of scope
- No changes to character data, selection logic, feat rendering inside the sheet, or any other page.
- No styling overhaul beyond what's needed to make the collapsed bar one row and the expanded view a bottom sheet.

## Files to change
- `src/pages/PlayGame.tsx` — collapsed bar markup, chevron toggle, expanded view turned into a backdrop + bottom sheet.

No new components, no data changes, no i18n keys added (reusing existing `game.selectCharacter` and `game.yourCharacters`).