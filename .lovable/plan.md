

## Fix `----` rendering as horizontal rule

### Problem
In `convertBodyToHtml` (line 125), only an exact `trimmed === "----"` match produces an `<hr>`. When `----` appears as a prefix (e.g., `----'''Special: Archetype'''`), it falls through to being rendered as a `<p>` with the literal dashes visible.

### Fix

**File: `src/lib/parseWikitext.ts`** (lines 125-128)

Change the exact match to a startsWith check. If the line starts with `----`, emit an `<hr>`, then render any remaining text as a paragraph:

```typescript
if (trimmed.startsWith("----")) {
  result.push("<hr>");
  const rest = trimmed.slice(4).trim();
  if (rest) {
    result.push(`<p>${convertInlineMarkup(rest)}</p>`);
  }
  continue;
}
```

Single change, one file.

