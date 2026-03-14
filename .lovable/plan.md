

## Fix: Sticky Background Image Resolution

### Problem
When a `background_image` meta tag is placed inside a child section (e.g., inside "Teaser"), the sibling section "Intro" at the same level doesn't inherit it — because the current logic only walks **up** the ancestor chain, not across siblings. The user wants backgrounds to "stick": once a background appears in any section, it should remain until a new one overrides it.

### Current Logic
`resolveBackgroundImage(section, ancestorBg)` → returns `section.metadata.background_image || ancestorBg || null`

Each `SectionNode` passes its `effectiveBg` down to children, but siblings don't share state.

### Solution
Track a "last seen background" across the entire tree traversal using a mutable ref. As we render sections in document order, each section resolves its background as:
1. Its own `background_image` metadata (highest priority)
2. Its parent's background (passed via prop)
3. The last background that was displayed by any previous section (sticky fallback)

When a section resolves a background, it updates the shared "last seen" ref so subsequent sections inherit it.

### Changes

**`src/components/WikiSectionTree.tsx`**
- Add a `React.MutableRefObject<string | null>` (`lastBgRef`) created in the root `WikiSectionTree` component
- Pass it to every `SectionNode`
- In `SectionNode`, resolve background as: `section.metadata.background_image || parentBackground || lastBgRef.current`
- After resolving, update `lastBgRef.current` if there's a background

**`src/pages/PlayGame.tsx`** (player view)
- Same sticky logic in the `walk()` function that finds the active section's background: track the last-seen bg during traversal so sections without their own bg inherit from previously-visited siblings

**`src/lib/parseWikitext.ts`**
- No changes needed — `resolveBackgroundImage` can stay as-is since the sticky logic is UI-level

