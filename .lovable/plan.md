

## Filter Out Already-Picked General Feats from Picker

### Problem
When picking a "General Feat" type feat, the picker shows all general feats including ones the character already has (via level or free feats). This should be filtered out for General Feats only.

### Change — `src/components/CharacterFeatPicker.tsx`

In the `filteredFeats` useMemo (~line 216), after the existing category filtering for the `feat` filterMode branch (lines 224-229), add a step that removes any General Feat whose `id` is already present in `characterFeats` (both level feats and free feats).

```typescript
// After line 229, within the "feat" filter branch:
const ownedFeatIds = new Set((characterFeats ?? []).map(cf => cf.feat_id));
filtered = filtered.filter(f => {
  if (f.categories?.includes("General Feat") && ownedFeatIds.has(f.id)) return false;
  return true;
});
```

This only applies to General Feats — Archetype and other types remain unaffected. The `characterFeats` dependency is already available; just add it to the useMemo deps array.

### Files changed
- `src/components/CharacterFeatPicker.tsx`

