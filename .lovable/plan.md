

## Always Regenerate Parseable Fields on Import

### Problem
Currently, when a feat is "modified" (wiki content changed), the import only generates AI fields if they're **missing**. Since the content changed, the existing AI-generated description/subfeats/specialities are likely stale.

### Change

**`supabase/functions/import-wiki-feats/index.ts`** — in the processing loop (~lines 484-516):

- For **modified** feats (not just new), treat AI fields as needing regeneration:
  - If wiki metadata tags exist → use them (no change here)
  - Otherwise → always call `generateDescription`, `generateSubfeats`, `generateSpecialities` regardless of whether existing values are present
- For **new** feats, behavior stays the same (always generate)
- The `status` is already available on `item.status`

Concretely, change the conditions:
- `needsDescription` → also true when `item.status === "modified"` and no `meta.description`
- `!existingSubfeats` → also regenerate when `item.status === "modified"` and no `meta.subfeats`
- `!existingSpecialities` → also regenerate when `item.status === "modified"` and no `meta.specialities`

This is a ~6 line change in the execute block conditions.

