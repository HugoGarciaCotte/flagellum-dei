

## Fix WikiText Parser for Subsection Hierarchy

### Problem
The parser's heading regex `={2,6}` excludes level-1 headings (`=Title=`), so sections like `=Intro=`, `=Day 1=`, `=Part 1=` render as raw text instead of parsed sections. The wiki content uses all three levels: `=` (top-level), `==` (sub), `===` (sub-sub). Additionally, `**` nested list items are not handled.

### Changes

**`src/lib/parseWikitext.ts`**

1. Change `HEADING_RE` from `={2,6}` to `={1,6}` to capture level-1 headings
2. Add a guard to skip lines that start with `==>` (these are content links like `==>[[:Category:Feats]]`, not headings)
3. Add `TITLE_SIZES` entry for level 1 in the tree component
4. Support `**` nested lists in `convertBodyToHtml` — render as nested `<ul>` inside `<li>`

**`src/components/WikiSectionTree.tsx`**

1. Add level 1 to `TITLE_SIZES` map (e.g. `"text-2xl font-bold"`)

### Technical Details

Heading regex change:
```
- const HEADING_RE = /^(={2,6})\s*(.+?)\s*\1$/;
+ const HEADING_RE = /^(={1,6})\s*(.+?)\s*\1$/;
```

Guard against `==>` false positives — before matching, check the line doesn't start with `==>`.

Nested list support in `convertBodyToHtml`:
- `* item` → `<li>item</li>` (current)
- `** subitem` → nested `<ul><li>subitem</li></ul>` inside parent `<li>`

