

## Wiki-Embedded Metadata Tags for Feats

### Syntax (prefixed with `feat_`)

Following the existing `<!--@ scenario_level: 3 @-->` pattern, all feat-related keys are prefixed with `feat_`:

```text
<!--@ feat_one_liner: Grants a free combat speciality at character creation @-->
<!--@ feat_specialities: Swords, Axes, Bows, Crossbows, Shields, Unarmed @-->
<!--@ feat_subfeat:1: fixed, Faith @-->
<!--@ feat_subfeat:2: list, optional, Knowledge|Herbalism|Alchemy @-->
<!--@ feat_subfeat:3: type, optional, not:Archetype,not:Hidden Feat @-->
<!--@ feat_unlocks: Dark Feat @-->
```

### Parser function

Add a `parseEmbeddedFeatMeta(content: string)` function used by both edge functions. It extracts:
- `feat_one_liner` → `description`
- `feat_specialities` → `string[]` (comma-split)
- `feat_subfeat:N` → parsed into `SubfeatSlot[]` (format: `kind, [optional,] value`)
- `feat_unlocks` → `string[]` (comma-split) → `unlocks_categories`

### Changes

#### 1. `supabase/functions/import-wiki-feats/index.ts`
- Add `parseEmbeddedFeatMeta()` at the top
- In the processing loop (~line 410), call it on the wiki content first
- If `feat_one_liner` found → use it as description, skip `generateDescription`
- If `feat_subfeat:*` found → use parsed subfeats, skip `generateSubfeats`
- If `feat_specialities` found → use parsed list, skip `generateSpecialities`
- If `feat_unlocks` found → use parsed list for `unlocks_categories`

#### 2. `supabase/functions/regenerate-description/index.ts`
- Add same `parseEmbeddedFeatMeta()` function
- For each `action` (description, subfeats, specialities), check wiki meta first — if present, use it directly instead of calling AI

#### 3. `src/components/ManageFeats.tsx`
- Add a "Copy wiki tags" button in each feat's expanded view
- Generates the `<!--@ feat_... @-->` comment block from the feat's current DB data (description, subfeats, specialities, unlocks_categories)
- Copies to clipboard for pasting into the wiki

### No database changes needed.

