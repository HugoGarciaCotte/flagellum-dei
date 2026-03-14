

## Plan: Show section background image on player view

### What

When the GM activates a section, the player view (`PlayGame.tsx`) should display the section's background image behind the card — but **not** the section's text content. Currently it only shows a title derived from the slug.

### Changes to `src/pages/PlayGame.tsx`

1. **Import** `parseWikitext`, `findSection`, `resolveBackgroundImage`, `extractImageUrls` from `@/lib/parseWikitext`

2. **Parse scenario content** with `useMemo` (same pattern as `HostGame.tsx`):
   - Get `effectiveScenario.content`, parse with `parseWikitext`
   - Preload images via `extractImageUrls` in a `useEffect`

3. **Resolve the active section** — use `findSection(sections, currentSectionId)` to get the `WikiSection` object. Walk ancestors to resolve the background via `resolveBackgroundImage`.

4. **Apply background to the card** — if a background URL is found, set `backgroundImage` with a dark overlay gradient (same technique as `WikiSectionTree`). Keep showing just the section title — no body content.

5. **Use real title** — replace the slug-to-title regex with `activeSection.title` when available, falling back to current behavior.

### Files changed
- `src/pages/PlayGame.tsx`

