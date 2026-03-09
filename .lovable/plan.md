

## Fix `----` Horizontal Rule Rendering in Feat Content

### Problem
In MediaWiki syntax, `----` is a horizontal rule. The `convertBodyToHtml` function in `parseWikitext.ts` doesn't handle it — it wraps every non-list, non-empty line in `<p>` tags, so `----` becomes `<p>----</p>` (rendered as literal text) instead of `<hr>`. The `convertInlineMarkup` function has a regex for it, but it uses `^----$` with multiline flag which only works on raw multi-line strings, not on individual trimmed lines.

### Fix: `src/lib/parseWikitext.ts`

In `convertBodyToHtml`, add a check for the `----` line before the fallback paragraph rendering (around line 125-129):

```typescript
// After closeListsTo(0) and before the empty/paragraph checks:
if (trimmed === "----") {
  result.push("<hr>");
  continue;
}

if (trimmed === "") {
  result.push("<br>");
} else {
  result.push(`<p>${convertInlineMarkup(trimmed)}</p>`);
}
```

This is a one-line addition in the line processing loop. The `Special:` label that follows the `----` in wiki content will then naturally appear below the horizontal rule as a separate paragraph.

