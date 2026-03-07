

## Render Wiki Links as Hoverable Feat References

### Problem
Text fields like prerequisites, description, and special contain `[[Courage]]` wiki syntax that is currently stripped to plain text. The user wants these rendered as visually distinct, hoverable elements that show the referenced feat's details on hover.

### Approach

**1. New component: `WikiLinkedText`** (`src/components/WikiLinkedText.tsx`)
- Takes a raw string containing `[[FeatName]]` or `[[target|label]]` syntax
- Splits the string on wiki link patterns, rendering plain text segments as-is and links as styled `HoverCard` triggers
- On hover, shows a card with the feat's description, prerequisites, special, and synonyms (fetched from the feats table)
- Uses a shared query for all feats (already fetched in CharacterFeatPicker context) or its own lightweight query with caching
- Styled as: underline-dotted, primary-colored text to indicate interactivity

**2. Update `parseFeatContent.ts`**
- Stop stripping wiki links from the returned field values — return raw text with `[[...]]` intact
- Remove calls to `stripWikiLinks` from the return block

**3. Update `FeatDetailsDisplay.tsx`**
- Replace plain `<p>` text with `<WikiLinkedText text={fields.description} />` etc. for all four fields
- The component handles rendering links inline within the text

**4. Update `parseWikitext.ts` — scenario content**
- In `convertInlineMarkup`, instead of stripping `[[FeatName]]` to plain text, render as `<span class="wiki-feat-link" data-feat="FeatName">FeatName</span>`

**5. Update `WikiSectionTree.tsx` — make scenario wiki links hoverable**
- After rendering via `dangerouslySetInnerHTML`, use a `useEffect` + `useRef` to find `.wiki-feat-link` spans and attach popovers (or replace with a custom renderer that processes HTML nodes)
- Alternatively, replace `dangerouslySetInnerHTML` with a React-based renderer that converts `wiki-feat-link` spans to `HoverCard` components

### Hover card content
Each hover card shows:
- **Feat title** (bold)
- **Description** (from the feat's parsed content)
- **Prerequisites** (if any)
- **Special** (if any)

Data source: query the `feats` table by title match. Cache aggressively since the feat list rarely changes.

### Files changed
- `src/components/WikiLinkedText.tsx` (new) — inline text renderer with hoverable feat links
- `src/lib/parseFeatContent.ts` — stop stripping wiki links
- `src/components/FeatDetailsDisplay.tsx` — use `WikiLinkedText` for field values
- `src/lib/parseWikitext.ts` — render wiki links as data-attributed spans instead of plain text
- `src/components/WikiSectionTree.tsx` — make wiki link spans interactive with hover cards

