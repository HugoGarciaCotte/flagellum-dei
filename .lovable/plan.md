

## Move Character Editing Into a Dialog

Currently, editing a character replaces the character list inline on the Dashboard (view-swap pattern). The user wants it in a modal dialog instead.

### Changes to `src/pages/Dashboard.tsx`

1. **Replace inline view-swap with a Dialog**: Instead of conditionally rendering `CharacterSheet` in place of the character list, always show the character list and open a `Dialog` when `editingCharId` is set.

2. **Remove the back arrow button** and the conditional header text (`"Edit Character"` / `"My Characters"`) — header always says "My Characters" since editing is in a dialog now.

3. **Remove `ArrowLeft` import** (no longer needed).

4. **Dialog structure**:
   - Controlled by `!!editingCharId` open state
   - `DialogContent` with `max-h-[85vh] overflow-y-auto` (same pattern as GMPlayerList's edit dialog)
   - `DialogTitle`: "Edit Character"
   - Body: `<CharacterSheet characterId={editingCharId} mode="player" onDone={...} />`
   - `onDone` closes dialog and invalidates queries

5. **After wizard creates a character**: Instead of `setEditingCharId(charId)` (which previously triggered inline editing), open the dialog with the new character ID so the user can immediately edit it in the dialog.

