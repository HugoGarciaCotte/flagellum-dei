

## Fix: Edit Character Blanks the Screen

### Root Cause
When clicking "Edit" on a character, the Dashboard opens a Radix `Dialog` programmatically (via `charDialogOpen` state). The dialog overlay renders but the `DialogContent` — containing `CharacterSheet` with `CharacterFeatPicker` — fails to display properly, resulting in a blank screen with just the background color visible.

This is a recurring issue with using `Dialog` for the character editor on the Dashboard. The Dialog's focus trapping and portal rendering conflict with the complex interactive content inside `CharacterFeatPicker` (inputs, buttons, inline picker views).

### Solution
Stop using `Dialog` for editing characters on the Dashboard. Instead, replace it with **inline editing**: when the user clicks "Edit", the character list section is replaced with the `CharacterSheet` component directly in the page flow. A "Back" button returns to the list.

Keep the `Dialog` only for "New Character" (creating), since that's a simpler flow.

### Changes

#### `src/pages/Dashboard.tsx`
1. Separate the "New Character" Dialog from the edit flow entirely.
2. Add an `editingCharId` state (distinct from dialog state).
3. When `editingCharId` is set, render `CharacterSheet` inline in place of the character list section, with a back/close button.
4. When `editingCharId` is null, render the normal character list.
5. The "New Character" Dialog stays as-is but only handles creation (remove `editingChar`/`activeCharId` complexity from it — after creation, close dialog and set `editingCharId` to open inline editor).

### Behavior
- **New Character**: Click button → Dialog opens with `CreateCharacterForm` → on create, dialog closes, inline editor opens for the new character.
- **Edit Character**: Click pencil → character list hides, `CharacterSheet` renders inline → click "Back" to return to list.

### Files Changed
1. `src/pages/Dashboard.tsx` — Replace Dialog-based editing with inline rendering

