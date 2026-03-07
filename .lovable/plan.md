

## Improve FeatListItem and Subfeat Picker

### Changes

#### 1. FeatListItem — always show full content when expanded

Currently `FeatDetailsDisplay` parses the `{{Feats|...}}` template and only shows extracted fields. When expanded, the item should show the **full rendered content** via the standard wiki engine, not just parsed fields.

**`src/components/FeatListItem.tsx`**: The component already renders `<FeatDetailsDisplay content={feat.content} />` when expanded — so the fix is in `FeatDetailsDisplay` itself.

**`src/components/FeatDetailsDisplay.tsx`**: If `parseFeatFields` returns nothing useful, fall back to rendering the raw content through `WikiLinkedText`. Also always render the full content below the parsed fields so nothing is hidden.

Actually, looking more carefully: `parseFeatFields` extracts description/special/prerequisites from a `{{Feats|...}}` template. But the full wikitext content may contain more than just those fields. The fix: after rendering parsed fields, also render the full raw content through the wiki engine as a fallback/supplement. Or better: always render the content via `renderWikiBlockHtml` from `parseWikitext.ts` so the full MediaWiki markup is visible.

**Approach**: In `FeatDetailsDisplay`, add a "Full Content" section that renders the entire `content` string through `renderWikiBlockHtml` (the standard wiki rendering engine), so all markup is visible. Keep the parsed fields as a structured summary above it.

#### 2. Subfeat picker — always include "None" option

Currently in `CharacterFeatPicker.tsx`:
- **List subfeats** (line 543): Only shows "None" when `slot.optional` is true
- **Type subfeats** (line 573): Only shows remove button when `slot.optional` is true

**Fix**: Always add a "None" option for both list and type subfeat selectors, regardless of `slot.optional`.

- Line 543: Remove the `slot.optional &&` guard — always show `<SelectItem value="__none__">None</SelectItem>`
- Lines 573-582: Remove the `slot.optional &&` guard on the remove button for type subfeats

### Files Changed

1. **`src/components/FeatDetailsDisplay.tsx`** — Add full wiki-rendered content display
2. **`src/components/CharacterFeatPicker.tsx`** — Always show "None" option in subfeat selectors

