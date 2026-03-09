

## Standardize Player-Facing Feat Lists (Keep Admin Separate)

### What changes

Merge the **Wizard** feat list rendering to match the **CharacterFeatPicker** pattern. Admin (`ManageFeats`) stays untouched.

### Changes

#### 1. `FeatListItem.tsx` — Always show full description line (not truncated)
- Remove `line-clamp-1` from the collapsed description (line 98) so the one-liner is always fully visible
- Keep the expanded description as-is for the full detail view

#### 2. `CharacterCreationWizard.tsx` — Use "Pick this feat" button instead of click-to-select
- **Remove the wrapping `<div onClick={() => onSelect(f.id)}>`** in `renderFeatList` (~line 412-414, 422) that auto-selects on click
- **Remove the `ring-2 ring-primary` selected highlight** (selection is now confirmed by button, not by clicking the row)
- **Add `expandedContent`** to each `FeatListItem` with a "Pick this feat" `<Button>` that calls `onSelect(f.id)` — same pattern as `CharacterFeatPicker` (line 791-797)
- This makes Wizard and FeatPicker behave identically: click row to expand → read details with wiki hover cards → click "Pick" button to confirm

#### 3. No changes to `ManageFeats.tsx`
Admin feat manager stays fully separate as requested.

### Result
Two player-facing contexts (Wizard + FeatPicker) share the exact same `FeatListItem` interaction pattern: title + badges + full one-liner always visible, expand for rich wiki content, explicit "Pick" button to select.

