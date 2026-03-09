

## Make Entire FeatListItem Card Clickable

### Problem
Only the header row (title + chevron) is wrapped in a `<button>` that triggers expand. The description text and empty card areas are outside this button, so clicking them does nothing.

### Fix in `src/components/FeatListItem.tsx`

Move the `onClick={onToggleExpand}` handler to the outer `<div>` (the card container) and add `cursor-pointer`. Remove the inner `<button>` wrapper, replacing it with a plain `<div>` for the header content. Keep `e.stopPropagation()` on the speciality dropdown and actions to prevent accidental toggles when interacting with those elements.

Key changes:
- Outer card div gets `onClick={onToggleExpand}` and `cursor-pointer`
- Inner `<button>` becomes a `<div>` (styling preserved)
- Actions div gets `onClick={e => e.stopPropagation()}` to prevent expand when clicking action buttons

