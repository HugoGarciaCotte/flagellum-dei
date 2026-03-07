

## Improve Character Sheet Feat Display

### Problem
Currently, assigned feats in the character sheet only show the title on the main row. The description is hidden until you expand. The user wants the description visible by default (collapsed view), and when expanded, the full content shows.

### Changes — `src/components/CharacterFeatPicker.tsx`

**Level feats (lines ~554-623):**
1. Below the feat title row (after the `</div>` closing the flex row at line 610), always show `assignedFeat.description` as a subtle line — not gated behind expand.
2. Move the full `content` display to only show when expanded (keep current expand behavior for content only).

**Free feats (lines ~649-710):**
Same pattern — always show description below the title, full content on expand.

**Layout adjustment:**
- Description: always visible as `text-xs text-muted-foreground line-clamp-2` below the title row
- On expand: show full `content` with the existing styling
- Remove description from the expanded section (since it's always visible now)
- Keep the chevron indicator for expand/collapse of full content

### Files changed
- `src/components/CharacterFeatPicker.tsx`

