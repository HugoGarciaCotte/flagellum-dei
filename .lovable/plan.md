

## Filter Out Archetypes If Character Already Has One

### Problem
When leveling up, a character who already has an archetype can still see and select other archetypes from the feat list.

### Change: `src/components/CharacterFeatPicker.tsx`

In the `filteredFeats` memo (around line 521-526), after the existing "hide owned General Feats" filter, add an additional filter: if the character already owns any feat with the "Archetype" category, exclude all other Archetype feats from the list.

```typescript
// After the owned General Feat filter (~line 526):
const hasArchetype = (characterFeats ?? []).some(cf => {
  const feat = featMap.get(cf.feat_id);
  return feat && isArchetype(feat);
});
if (hasArchetype) {
  filtered = filtered.filter(f => !isArchetype(f) || ownedFeatIds.has(f.id));
}
```

This keeps the character's current archetype visible (if already owned) but hides all other archetypes. Single file change.

