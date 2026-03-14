

## Fix Background Image Resolution Logic

**Problem**: Backgrounds are "sticky" — once set, they bleed into all subsequent sibling sections via `lastBgRef` (GM side) and `lastSeenBg` (player side). The user wants hierarchical scoping: a section shows its own background, or inherits from its parent, never from a sibling.

**Expected behavior**:
```text
=Section 1=
<!--@ background_image: bg1.jpg @-->    → shows bg1
==Subsection 2==
<!--@ background_image: bg2.jpg @-->    → shows bg2
==                                      → closes Subsection 2
(back in Section 1)                     → shows bg1 again
==Subsection 3==                        → shows bg1 (inherited from parent)
```

### Changes

**1. `src/lib/parseWikitext.ts`** — `resolveBackgroundImage`
- Keep as-is. It already does `section.metadata.background_image || ancestorBg || null` which is correct for parent-child inheritance.

**2. `src/components/WikiSectionTree.tsx`** — Remove `lastBgRef`
- Remove the `lastBgRef` prop and all references to it throughout the component
- In `SectionNode`, compute `effectiveBg` as just `resolveBackgroundImage(section, parentBackground)` — no `lastBgRef.current` fallback
- Pass `effectiveBg` as `parentBackground` to children (already done)
- This ensures siblings don't inherit each other's backgrounds, only from their parent

**3. `src/pages/PlayGame.tsx`** — Fix `findSectionWithBg`
- Remove the `lastSeenBg` variable that causes sibling bleed
- Simplify the walk: `effectiveBg = s.metadata.background_image || parentBg || null`
- Pass `effectiveBg` down to children recursively
- This makes the player side match the GM side exactly

### Summary of removals
- `lastBgRef` from `WikiSectionTree` and `SectionNode` props
- `lastSeenBg` from `PlayGame.findSectionWithBg`
- Both replaced by pure parent-to-child inheritance already handled by `resolveBackgroundImage`

