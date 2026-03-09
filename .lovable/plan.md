

## Fix: Subfeats not showing in CharacterListItem on Dashboard

### Root Cause

The `CharacterListItem` component uses a deeply nested PostgREST query (3 levels: `character_feats` -> `character_feat_subfeats` -> `feats`) to fetch subfeats in a single call. This nested join is likely failing silently, returning empty arrays for the `character_feat_subfeats` relationship.

By contrast, `CharacterFeatPicker` fetches subfeats separately with `.from("character_feat_subfeats").select("*").in("character_feat_id", cfIds)` and that works fine.

### Fix

**`src/components/CharacterListItem.tsx`** -- Split the single nested query into two simpler queries:

1. Query `character_feats` with just the feat title join (2 levels, known to work)
2. Query `character_feat_subfeats` separately using the character_feat IDs, joining `feats` for the subfeat title
3. Merge the results in JS before rendering

```tsx
// Query 1: character_feats with feat titles
const { data } = await supabase
  .from("character_feats")
  .select("id, feat_id, feats!character_feats_feat_id_fkey(title)")
  .eq("character_id", character.id)
  .order("level");

// Query 2: subfeats for those character_feats  
const cfIds = data.map(cf => cf.id);
const { data: subfeats } = await supabase
  .from("character_feat_subfeats")
  .select("character_feat_id, subfeat_id, feats!character_feat_subfeats_subfeat_id_fkey(title)")
  .in("character_feat_id", cfIds);

// Merge: attach subfeats to their parent character_feat
```

The rendering code stays the same -- just the data fetching changes.

### Files to edit
- `src/components/CharacterListItem.tsx`

