

## Make FeatListItem two-line layout

### Change

**File: `src/components/FeatListItem.tsx`**

Move the description out of the `flex items-center` row and into its own line below. Currently (line 84-86) the description `<p>` is inside the flex row, making it compete for horizontal space. Move it outside and below the title row so the layout becomes:

- **Line 1**: titlePrefix + title + category badges + action buttons
- **Line 2**: one-liner description (full width, no longer truncated inside the flex row)

```
┌─────────────────────────────────────────────────┐
│ [prefix] Title  [badges...]      [Select] [Info]│
│ One-liner description text here                 │
└─────────────────────────────────────────────────┘
```

Specifically, restructure the inner `div` (lines 68-88) so the description `<p>` sits after the closing of the `flex items-center` div, still within the padding container. No prop changes, no interface changes — purely a layout adjustment within the same component.

### Files to edit
- `src/components/FeatListItem.tsx`

