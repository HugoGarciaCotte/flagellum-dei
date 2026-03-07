

## Fix: Feat expand/collapse not working on click

### Root Cause
The `ChevronDown` icon (line 669 in `CharacterFeatPicker.tsx`) is purely decorative — it has no click handler. Only the feat title text is clickable to toggle expand/collapse, which is not intuitive. Users naturally click the chevron arrow expecting it to toggle.

### Fix
Wrap both the feat title and the chevron in a single clickable button, or make the entire row header clickable for expand/collapse. The simplest approach: wrap the feat title + chevron together in the existing `<button>` element so clicking either one toggles the content.

### Changes in `src/components/CharacterFeatPicker.tsx`

Move the `ChevronDown` icon inside the existing `<button>` that handles the expand toggle (line 632-638), and remove the standalone `ChevronDown` on line 669. This makes the chevron part of the clickable area.

The same pattern applies to the free feats section if it has similar expand/collapse behavior.

### Note
The feats database is currently empty (cleared for reimport). The user will need to reimport feats before testing this fix.

