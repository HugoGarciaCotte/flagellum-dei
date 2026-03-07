

## Remove Diff Display from Admin UI, Log Instead

Currently the import preview shows inline diff details (char position, snippets, lengths) in the `ImportFeatsCard` UI. Instead, log this info server-side and strip it from the response.

### Changes

1. **`supabase/functions/import-wiki-feats/index.ts`** (~lines 188-201):
   - Keep the diff computation but `console.log` it instead of including it in the response item
   - Remove `diff` from the items array — just push `{ title, status: "modified", categories }`

2. **`src/components/ImportFeatsCard.tsx`**:
   - Remove `diff` from the `PreviewItem` type (line 13)
   - Remove the diff display block (lines 227-234)

