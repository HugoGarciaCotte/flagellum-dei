

## Fix: Show Only Template-Expanded Content with Hoverable Links

### Problem
When expanding a feat, users see duplicated information:
1. First, parsed raw fields (Description, Prerequisites, Special) extracted from `raw_content`
2. Then, the full template-expanded `content` rendered as HTML

The user wants **only** the template-expanded `content` displayed, with `[[wiki links]]` rendered as hoverable feat cards.

### Changes

#### 1. `src/components/FeatDetailsDisplay.tsx` — Simplify to content-only
- Remove all the individual field rendering (description, special, synonyms sections)
- Keep only the `fullHtml` block (the template-expanded content)
- Keep `prerequisites` and `blocking` from embedded meta — these are structured metadata not present in the expanded content
- Add hover interaction for `.wiki-feat-link` spans (same pattern used in `WikiSectionTree.tsx`): use a `useRef` + `useEffect` to style links, and `onMouseOver`/`onMouseOut` handlers to show `HoverCard`-style tooltips
- Reuse the `FeatHoverContent` approach from `WikiLinkedText.tsx` and the feats-map query

#### 2. `src/components/FeatListItem.tsx` — Remove description line
- Remove the `feat.description` paragraph (lines 96-99) that shows below the title when collapsed — this is redundant with the expanded content and clutters the list

### Result
Expanding a feat shows a single, clean, fully wikified HTML block with hoverable links to other feats, plus any prerequisites/blocking metadata that comes from embedded tags.

