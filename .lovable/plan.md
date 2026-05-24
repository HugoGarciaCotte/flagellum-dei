## Show full feat info in Character Details

In `src/components/CharacterDetails.tsx`, replace the current minimal feat rendering (title + one-liner description) with the full `FeatDetailsDisplay` component already used in the wiki/feat library — same component the player sees when browsing feats.

### Change

In `renderFeat(featId)`:
- Keep the title line (`feat.title`).
- Below the title, render `<FeatDetailsDisplay content={feat.content} rawContent={feat.raw_content} />`.

This adds, per feat:
- **Prerequisites** (with wiki links + hover tooltips on linked feats)
- **Incompatible with** (blocking list)
- **Full description / special / body text** (parsed wikitext, not just the one-liner meta description)

Applies identically to top-level feats and subfeats (both go through `renderFeat`).

### Out of scope

- No changes to the edit `CharacterSheet`, list item, or dialog wrapper.
- No data model or i18n changes.
- Specialities line stays as-is below the feat block.
