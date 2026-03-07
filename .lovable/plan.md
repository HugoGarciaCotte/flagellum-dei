

## Remove Separate DB Columns, Parse Parseable Fields from Content

### Summary

Drop the `description`, `subfeats`, `specialities`, and `unlocks_categories` columns from the `feats` table. Instead, all parseable metadata lives as `<!--@ ... @-->` tags embedded in the `content` column and is parsed on-the-fly wherever needed.

### What Changes

#### 1. Database Migration
Drop 4 columns from `feats`:
```sql
ALTER TABLE public.feats DROP COLUMN description;
ALTER TABLE public.feats DROP COLUMN subfeats;
ALTER TABLE public.feats DROP COLUMN specialities;
ALTER TABLE public.feats DROP COLUMN unlocks_categories;
```

#### 2. New Shared Parser: `src/lib/parseEmbeddedFeatMeta.ts`
Extract the `parseEmbeddedFeatMeta` function (currently duplicated in two edge functions) into a shared client-side module. Returns `{ description, specialities, subfeats, unlocks_categories }` from content string. This same logic will be used by all frontend components.

#### 3. Frontend Components

**`src/components/CharacterFeatPicker.tsx`**:
- Remove `description`, `subfeats`, `unlocks_categories`, `specialities` from the Supabase select query (only fetch `id, title, categories, content`)
- Update the `Feat` type to remove those fields
- Add a `useMemo` that builds a map of parsed metadata per feat using `parseEmbeddedFeatMeta(feat.content)`
- Update all references to `feat.subfeats`, `feat.unlocks_categories`, `feat.specialities`, `feat.description` to use the parsed map instead

**`src/components/ManageFeats.tsx`**:
- Same pattern: remove columns from query, parse from content
- Update `Feat` type, `hasSubfeats`, `hasSpecialities`, `hasUnlocks`, `hasDescription` helpers
- `generateWikiTags` and `handleCopyWikiTags` now read from parsed content instead of DB fields
- `openEdit` form no longer has a separate description field (it's in the content)

**`src/components/WikiLinkedText.tsx`**:
- `FeatHoverContent` already uses `parseFeatFields(feat.content)` for some fields — update to also use `parseEmbeddedFeatMeta` for the one-liner description instead of `feat.description`

**`src/components/FeatListItem.tsx`**:
- Update `FeatListItemFeat` interface: remove `description`, add it as parsed from content
- Callers pass parsed description instead

**`src/hooks/useOfflineFeats.ts`**:
- Remove `description` from the select query (just cache `id, title, categories, content`)

#### 4. Edge Functions

**`supabase/functions/import-wiki-feats/index.ts`**:
- After generating AI fields, instead of storing them in separate columns, append/merge the `<!--@ ... @-->` block into the `content` string before upserting
- The payload only sets `content` and `categories` (no more `description`, `subfeats`, etc.)

**`supabase/functions/regenerate-description/index.ts`**:
- After generating description/subfeats/specialities, merge the tags back into the feat's `content` field instead of updating separate columns
- Use the same `generateParseableBlock` + `mergeParseableBlock` logic from `push-wiki-feats`

**`supabase/functions/push-wiki-feats/index.ts`**:
- `generateParseableBlock` now reads from the content's embedded tags (parse them out) rather than from separate DB columns — actually this already works since it reads `feat.*` which will just be content-based after the migration

**`supabase/functions/validate-feat/index.ts`**:
- If it references `feat.description` or `feat.subfeats`, update to parse from `feat.content`

#### 5. Data Migration (Pre-Drop)
Before dropping columns, a one-time migration merges existing column values into each feat's `content` as `<!--@ ... @-->` tags, so no data is lost. This will be an UPDATE statement that appends the parseable block to content for each feat that has metadata in the columns.

### Execution Order
1. Run data migration to embed column values into content
2. Update all frontend code and edge functions to parse from content
3. Drop the columns

### Files Changed
- `src/lib/parseEmbeddedFeatMeta.ts` (new)
- `src/components/CharacterFeatPicker.tsx`
- `src/components/ManageFeats.tsx`
- `src/components/WikiLinkedText.tsx`
- `src/components/FeatListItem.tsx`
- `src/hooks/useOfflineFeats.ts`
- `supabase/functions/import-wiki-feats/index.ts`
- `supabase/functions/regenerate-description/index.ts`
- `supabase/functions/push-wiki-feats/index.ts`
- `supabase/functions/validate-feat/index.ts`
- Database migration (data + schema)

