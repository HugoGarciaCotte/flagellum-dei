

## Store Raw + Expanded Content for Feats

**Problem**: After pushing parseable fields to the wiki, re-importing via `expandtemplates` strips HTML comments (the parseable block), causing false "modified" flags. We need to store both raw and expanded content, compare both during import, and only show expanded content to users.

### 1. Database Migration
Add `raw_content text` column to the `feats` table.

### 2. Update `import-wiki-feats/index.ts`
For each feat, fetch **two** versions from the wiki:
- **Raw**: via `query` API with `revisions` + `rvprop=content` (preserves HTML comments/parseable block)
- **Expanded**: via `expandtemplates` (template-expanded, no comments)

Comparison logic: a feat is "modified" if **either** the expanded content OR the raw content differs from what's in the DB. The parseable block lives only in `raw_content`.

On upsert, write:
- `content` = expanded content (for display)
- `raw_content` = raw wikitext (for sync comparison)

### 3. Update `regenerate-description/index.ts`
When AI generates parseable fields, merge the parseable block into `raw_content` (not `content`). The `content` field stays as pure expanded content without the parseable block.

Update line ~416-421: write `raw_content` with merged parseable block, leave `content` unchanged (or strip parseable block from it if present).

### 4. Update `push-wiki-feats/index.ts`
- **Preview mode** (line ~208): read parseable meta from `feat.raw_content` instead of `feat.content`
- **Execute mode** (line ~244): read parseable meta from `feat.raw_content` instead of `feat.content`
- Select `raw_content` in the query (line ~185)

### 5. Update `check-feats-ai/index.ts`
Read parseable meta from `feat.raw_content` instead of `feat.content`.

### 6. Update frontend components
No changes needed for display — all components already read `feat.content` which will remain the expanded (display-friendly) version.

For components that read parseable metadata from `feat.content` (WikiLinkedText, WikiSectionTree, FeatDetailsDisplay, ManageFeats), these need to read from `feat.raw_content` instead since the parseable block will only be in `raw_content`.

### 7. Update DB select queries
Anywhere feats are fetched and parseable metadata is needed, include `raw_content` in the select. Key locations:
- `import-wiki-feats` existing feats query (line ~130): add `raw_content`
- `ManageFeats.tsx` useQuery
- `WikiLinkedText.tsx` feat query
- `WikiSectionTree.tsx` feat query

### Summary of data flow

```text
Wiki (raw wikitext + parseable block)
  ↓ import
DB: raw_content = raw wikitext (with parseable block)
    content     = expanded wikitext (no parseable block)
  ↓ display
UI: reads content (expanded, clean)
    reads raw_content for parseable metadata (description, prerequisites, etc.)
  ↓ push
Wiki: reads raw_content for parseable block to push back
```

