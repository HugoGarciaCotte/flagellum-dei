

## Support Positive Category Filters in Subfeat Picker

### Problem
The subfeat "type" filter currently only supports exclusion syntax (`not:Archetype,not:Hidden Feat`). Feats like "Background" need to offer a subfeat slot that picks **only** from "Dark Feat" category feats, not exclude categories. Same for "Bone Artifacts."

### Changes

#### 1. `src/components/CharacterFeatPicker.tsx` — Support positive filters
Update the type filter logic (lines 435-439) to handle both positive and negative filters:
- `not:Dark Feat` → exclude feats with "Dark Feat" category (existing)
- `Dark Feat` → include **only** feats with "Dark Feat" category (new)

If any positive filters exist, require the feat to match at least one. If any negative filters exist, exclude matching feats.

#### 2. `supabase/functions/import-wiki-feats/index.ts` — Update AI prompt
Update the `generateSubfeats` system prompt to explain positive filters alongside negative ones:
- `"not:Archetype"` excludes a category
- `"Dark Feat"` requires a category
- Example: `filter: "Dark Feat"` means "pick any feat in the Dark Feat category"

#### 3. `supabase/functions/regenerate-description/index.ts` — Same prompt update
Mirror the filter syntax update in the regeneration prompt.

### No database or migration changes needed.

