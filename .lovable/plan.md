

## Fix: Edit Character Dialog Breaks Screen

### Root Cause
The Dashboard's "Edit Character" button opens a `Dialog` containing `CharacterSheet`, which contains `CharacterFeatPicker`. The `CharacterFeatPicker` has its own nested fullscreen `Dialog` (the feat picker, line 827-900 with `max-w-none w-full h-full m-0 rounded-none`). Radix UI dialogs don't nest well — the inner dialog's portal, overlay, and focus-trapping interfere with the outer dialog, causing layout/rendering bugs.

### Solution
Convert the feat picker from a nested `Dialog` to a conditional inline panel. When `pickerTarget` is set, replace the feat list content with the picker UI inline (within the same scroll area), instead of opening a second dialog.

### Changes

#### `src/components/CharacterFeatPicker.tsx`
- Remove the `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` wrapping the feat picker (lines 827-900).
- When `pickerTarget !== null`, render the picker UI inline at the top of the component (above the level list), with a back/close button, search bar, and scrollable feat list.
- Keep the same filter/search/select logic, just render it inline instead of in a nested dialog.
- Add a header bar with the `dialogTitle` text and a close button to dismiss.

#### `src/components/CharacterSheet.tsx`
- No changes needed.

#### `src/pages/Dashboard.tsx`
- No changes needed.

### Technical Detail
The inline picker replaces the current view when active (like a "screen" swap within the component), showing:
1. A header with title + close button
2. The archetype/feat filter toggle (when applicable)
3. Search input
4. Scrollable feat list with expand/select

When dismissed, the normal level feat list reappears.

