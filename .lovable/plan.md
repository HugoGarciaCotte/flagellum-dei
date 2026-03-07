

## Feat Picker UX Improvements

### Changes to `src/components/CharacterFeatPicker.tsx`

**1. Hide Archetype/Feat toggle when character already has an archetype**

Currently, when `hasArchetype` is true and the player is on a non-archetype level, `canPickArchetype` returns false so the Archetype button is hidden — but the Feat button still renders alone in its row, wasting space. 

Fix: When `hasArchetype` is true and `canPickArchetype(level)` is false, skip rendering the entire filter toggle row (lines 265-288). The `filterMode` is already set to `"feat"` in `openSelector`, so no toggle is needed.

**2. Make feat picker a fullscreen dialog**

Replace the inline expanding picker (currently rendered inside each level's card) with a `Dialog` that opens fullscreen. When a user clicks "Choose feat" or "Edit":
- Open a `Dialog` with class `max-w-none w-full h-full m-0 rounded-none` (or use a Sheet with `side="bottom"` at full height)
- Move the search input, filter toggles, and feat list into the dialog
- The feat list gets `flex-1 overflow-y-auto` instead of `max-h-48`
- On feat selection or cancel, close the dialog

This applies to both the level-based picker and the free feat picker.

### Files changed
- `src/components/CharacterFeatPicker.tsx` — wrap picker in fullscreen Dialog, hide unnecessary toggle

