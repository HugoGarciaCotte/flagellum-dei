

## Standardize Feat Picking UI Across Wizard and Feat Picker

### Problem
There are two different UIs for picking feats:

1. **CharacterFeatPicker** (edit mode): Uses `FeatListItem` with `onQuickAction` → inline **"Select"** button + **"Info"/"Hide"** toggle. Clean, compact.

2. **CharacterCreationWizard** (`renderFeatList`): Uses `FeatListItem` *without* `onQuickAction`. Instead, it puts a full-width **"Pick this feat"** button inside `expandedContent`. User must expand first, then click inside. Different interaction pattern.

### Solution
Update the wizard's `renderFeatList` to match the CharacterFeatPicker pattern — use `onQuickAction` + `quickActionLabel="Select"` on every `FeatListItem`, and remove the "Pick this feat" button from `expandedContent`.

### Changes to `src/components/CharacterCreationWizard.tsx`

1. **`renderFeatList`** (lines 420-438): Pass `onQuickAction={() => onSelect(f.id)}` and `quickActionLabel="Select"` to each `FeatListItem`. Remove the `expandedContent` prop that contained the "Pick this feat" button.

2. **Subfeat step "None" option** (lines 573-581): Keep as-is — it's a separate skip option, not a feat card.

3. **Fixed subfeat display** (lines 556-562): Keep as-is — it shows a granted ability with a "Continue" button, not a picker.

This is a small, focused change — just the `renderFeatList` helper function needs updating so that the archetype list and subfeat choice lists use the same inline "Select" + "Info" button pattern as the CharacterFeatPicker.

