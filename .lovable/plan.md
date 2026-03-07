

## Standardize MediaWiki Rendering Across the App

### Problem

`WikiLinkedText` (used in feat details) only handles `[[links]]` — it does not process:
- `'''bold'''` / `''italic''` markup
- `----` horizontal rules
- `<br />` tags
- `[[Category:X]]` tags (should be hidden)
- `[[:Category:X|Label]]` (should show just the label text, no hover)
- Lists (`* item`, `# item`)

Meanwhile, `parseWikitext.ts` has a full `convertInlineMarkup` + `convertBodyToHtml` engine that handles all of this, but it outputs raw HTML strings. These two systems are disconnected.

### Plan

#### 1. Create a shared wikitext-to-HTML converter: `renderWikiContent`

Extract and export a new function from `src/lib/parseWikitext.ts`:

```typescript
export function renderWikiInlineHtml(text: string): string
```

This reuses the existing `convertInlineMarkup` logic but adds:
- **Category link handling**: `[[Category:X]]` → stripped entirely; `[[:Category:X|Label]]` → just `Label` as plain text (no hover span)
- **`<br />` / `<br>`** passthrough (already HTML, just keep it)
- **`----`** → `<hr>`

Also export `convertBodyToHtml` (renamed to `renderWikiBlockHtml`) for multi-line content that needs lists, `<pre>`, etc.

#### 2. Update `WikiLinkedText` to use the standard engine

Modify `WikiLinkedText.tsx` to:
1. Before parsing segments, run the text through the inline converter for `'''bold'''`, `''italic''`, `----`, `<br />`, and category stripping
2. For category links like `[[:Category:Prowesses|Prowess]]`, convert to plain text "Prowess" (no hover card)
3. For regular `[[Feat Name]]` links, keep the existing HoverCard behavior
4. Switch from rendering plain text `<Fragment>` segments to `dangerouslySetInnerHTML` spans for the text portions (since they now contain HTML from bold/italic conversion)

The segment parser needs to:
- Detect `[[Category:...]]` and strip them
- Detect `[[:Category:...|Label]]` and emit a plain text segment with the label
- Keep feat links as hoverable segments

#### 3. Update `FeatDetailsDisplay` — minor adjustment

The `<p>` wrappers around `WikiLinkedText` should use `<div>` instead since the rendered content may now contain block elements (`<hr>`, lists). Add appropriate prose styling.

#### 4. Scenario content (WikiSectionTree) — no change needed

`WikiSectionTree` already uses `convertBodyToHtml` via `parseWikitext` and renders with `dangerouslySetInnerHTML`. The section-splitting logic stays as-is. Only the internal body rendering benefits from the category-stripping fix being added to `convertInlineMarkup`.

### Files Changed

1. **`src/lib/parseWikitext.ts`** — Add category link handling to `convertInlineMarkup`; export `convertInlineMarkup` and `convertBodyToHtml`
2. **`src/components/WikiLinkedText.tsx`** — Use `convertInlineMarkup` for non-link text segments; handle category links as plain text; render text segments with `dangerouslySetInnerHTML`
3. **`src/components/FeatDetailsDisplay.tsx`** — Switch `<p>` wrappers to `<div>` to allow block-level rendered content

