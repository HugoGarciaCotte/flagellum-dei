

## Standardize Character Display in Player Mode (PlayGame)

The Dashboard pattern is: **CharacterListItem card** for display + **Dialog** for editing. Currently, PlayGame uses custom inline markup for both the peek bar and the character list, and shows CharacterSheet inline in the overlay instead of in a Dialog.

### Changes: `src/pages/PlayGame.tsx`

**1. Peek bar (lines 183-207)** — Replace the custom avatar+name with a compact `CharacterListItem` (no actions, just the card). If no character is selected, show a "Select a character" prompt.

**2. Character list in expanded overlay (lines 277-296)** — Replace the custom `<button>` elements with `CharacterListItem` cards, adding a Check icon and selection border for the active character, plus a Pencil edit button in `actions`.

**3. Editing flow** — Remove the inline `CharacterSheet` from the overlay (lines 245-251). Instead, add an `editingCharId` state and a `Dialog` containing `CharacterSheet` (same pattern as Dashboard lines 265-281). The Pencil button on each CharacterListItem opens this dialog.

**4. Expanded overlay simplification** — The overlay header no longer needs the avatar/name duplication; it becomes just a close button bar. The content is just the character list + create button.

### Summary of UI behavior after changes:
- **Peek bar**: Tapping opens the overlay showing all characters as CharacterListItem cards
- **Each card**: Shows portrait, name, description, feats summary. Has a Pencil edit button and a Select/Check indicator
- **Tapping Pencil**: Opens a Dialog with CharacterSheet (same as Dashboard)
- **Tapping the card itself**: Selects that character for the game
- **New Character button**: Still inline CharacterCreationWizard in the overlay

### Files to edit:
- `src/pages/PlayGame.tsx`

