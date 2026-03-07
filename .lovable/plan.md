

## Unlock Dark Feats via "Dark Faith" Feat

### Problem
The "Dark Faith" feat should unlock Dark Feats for a character during normal level-up. Currently, the level-up picker only shows General Feat and Prowess categories. We need:
1. A way to store that a feat "unlocks" a category (detected by AI during import)
2. The picker to check if the character owns any feat that unlocks Dark Feats, and if so, include them

### Approach

**1. Add `unlocks_categories` column to `feats` table**

A new nullable `text[]` column storing category names this feat unlocks (e.g., `["Dark Feat"]` for Dark Faith). Migration:
```sql
ALTER TABLE public.feats ADD COLUMN unlocks_categories text[] DEFAULT NULL;
```

**2. Update AI import to detect category-unlocking feats**

In `supabase/functions/import-wiki-feats/index.ts`, extend the `generateSubfeats` call (or add a parallel AI call) to also detect if a feat unlocks access to a category of feats. The AI prompt should identify feats like "Dark Faith" that grant access to Dark Feats. Store the result in `unlocks_categories`.

Simpler alternative: Since "Dark Faith" is the known case, we can add detection logic in the import — if the AI identifies it, store `["Dark Feat"]` in `unlocks_categories`. We'll extend the existing subfeat AI prompt to also return an `unlocks_categories` field.

**3. Update `CharacterFeatPicker.tsx` filtering logic**

In the `filteredFeats` memo (line ~366), check if any of the character's owned feats have `unlocks_categories`. If so, include those categories in the filter:

```typescript
// Gather unlocked categories from owned feats
const unlockedCategories = new Set<string>();
for (const cf of characterFeats ?? []) {
  const feat = featMap.get(cf.feat_id);
  if (feat?.unlocks_categories) {
    feat.unlocks_categories.forEach(c => unlockedCategories.add(c));
  }
}

// In level-up filter, also include unlocked categories
filtered = allFeats.filter(f =>
  (f.categories?.includes("General Feat") || 
   f.categories?.includes("Prowess") ||
   f.categories?.some(c => unlockedCategories.has(c))) &&
  !f.categories?.includes("Hidden Feat")
);
```

**4. Update Feat type to include `unlocks_categories`**

Add `unlocks_categories: string[] | null` to the `Feat` type and include it in the query select.

### Files changed
- **Migration**: Add `unlocks_categories` column to `feats` table
- `supabase/functions/import-wiki-feats/index.ts` — extend AI prompt to detect and store `unlocks_categories`
- `src/components/CharacterFeatPicker.tsx` — update Feat type, query, and filtering logic
- Types will auto-regenerate after migration

