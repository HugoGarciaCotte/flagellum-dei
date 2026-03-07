

## Comprehensive MediaWiki Formatting Support

### Problem
The current parser requires a space after `*` and `**` (e.g. `"* "`, `"** "`), but MediaWiki syntax does not require spaces — `*item` and `**subitem` are valid. The actual scenario content confirms patterns like `**Date :` (no space after `**`). Additionally, several common MediaWiki formatting constructs are not supported at all.

### Changes to `src/lib/parseWikitext.ts`

**1. Fix bullet matching to not require a trailing space**
- `*` at line start = bullet (with or without space)
- `**` at line start = sub-bullet (with or without space)
- `***` = third-level nesting
- Use a regex like `/^\*+/` to count depth, then slice the rest as content

**2. Add numbered lists (`#`, `##`, `###`)**
- `#` → `<ol><li>...</li></ol>`
- `##` → nested `<ol>`
- Same depth-tracking approach as bullets

**3. Add definition lists / indentation (`;` and `:`)**
- `;term` → `<dt>term</dt>`
- `:definition` → `<dd>definition</dd>` (also used for indentation)
- Wrap in `<dl>` tags

**4. Add preformatted text (lines starting with a space)**
- Lines beginning with ` ` (space) → `<pre>` blocks

**5. Add bold+italic combined (`'''''text'''''`)**
- Already handles `'''` (bold) and `''` (italic) separately
- Add `'''''` → `<strong><em>` before the individual patterns

**6. Add external links**
- `[url text]` → `<a href="url">text</a>`
- `[url]` → `<a href="url">[n]</a>`
- Bare URLs already partially handled by image extractor

### Implementation approach

Rewrite `convertBodyToHtml` with a proper stack-based list tracker that handles arbitrary nesting depth rather than just two levels (list/sublist). Track current list type (ul/ol/dl) and depth, emitting open/close tags as depth changes.

```text
Input:  *item1       → depth 1, ul
        **sub1       → depth 2, ul
        ***subsub    → depth 3, ul
        *item2       → depth 1, ul (close 2 levels)
        #numbered    → depth 1, ol (close ul, open ol)
```

### Single file change
- `src/lib/parseWikitext.ts` — rewrite `convertBodyToHtml` and `convertInlineMarkup`

