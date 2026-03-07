

## Strip HTML Comments from Displayed Content

### Problem
HTML comments (`<!-- ... -->`) in feat content and scenario wikitext are being rendered as visible text instead of being hidden.

### Changes

**1. `src/lib/parseFeatContent.ts`**
- Strip HTML comments from field values before returning them. Add a regex replace (`/<!--[\s\S]*?-->/g` → `""`) to the raw `content` string early in `parseFeatFields`.

**2. `src/lib/parseWikitext.ts`**
- In `convertInlineMarkup`, add a line to strip HTML comments: `text = text.replace(/<!--[\s\S]*?-->/g, "")`.
- Also strip comments from lines in the main `parseWikitext` loop so they don't appear as body content. Non-meta comments (regular `<!-- ... -->`) should be removed before processing each line.

**3. `src/components/WikiLinkedText.tsx`**
- Strip HTML comments from the input `text` before parsing segments, so comments inside feat fields rendered via WikiLinkedText are also removed.

### Files changed
- `src/lib/parseFeatContent.ts`
- `src/lib/parseWikitext.ts`
- `src/components/WikiLinkedText.tsx`

