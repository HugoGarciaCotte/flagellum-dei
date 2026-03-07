

## Diagnose Import "Modified" False Positives

We cannot directly fetch from prima.wiki right now (it's timing out from external fetch tools), so we need to add diagnostic output to the `import-wiki-feats` edge function to reveal the exact difference.

### Plan

**Add a `debug` mode to `import-wiki-feats/index.ts`** that, for feats detected as "modified", returns both the DB content and wiki content (or at least the first differing region) so you can see exactly what changed.

Changes in `supabase/functions/import-wiki-feats/index.ts`:

1. When `mode === "preview"`, include a `diff` field on each "modified" item showing:
   - `firstDiffAt`: character index of first difference
   - `dbSnippet`: ~80 chars around the first difference from DB content
   - `wikiSnippet`: ~80 chars around the first difference from wiki content
   - `dbLength` and `wikiLength` for quick comparison

This is a small addition to the existing preview response — no new endpoints, no schema changes. Once we see the actual difference, we can apply the correct normalization fix.

### Technical Detail

```typescript
// Inside the comparison block, when status is "modified":
function findFirstDiff(a: string, b: string) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return i;
  }
  return a.length !== b.length ? len : -1;
}

// Then include in preview items:
const idx = findFirstDiff(existingContent, newContent);
const pad = 40;
item.diff = {
  firstDiffAt: idx,
  dbSnippet: existingContent.slice(Math.max(0, idx - pad), idx + pad),
  wikiSnippet: newContent.slice(Math.max(0, idx - pad), idx + pad),
  dbLength: existingContent.length,
  wikiLength: newContent.length,
};
```

The preview response in the ImportFeatsCard UI already shows items — we just need to log or display the `diff` field from modified items to identify the whitespace issue.

