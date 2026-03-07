

## Plan: Change Active Section Highlight to Black

In `src/components/WikiSectionTree.tsx`, update the active section styling from the current `bg-foreground/10 border-l-4 border-foreground` to use a black background with contrasting white text.

### Change
**File: `src/components/WikiSectionTree.tsx`** (line ~44-46)
- Active section: change to `bg-black text-white` with `border-l-4 border-black`
- Active play button: change from `text-primary` to `text-white`

