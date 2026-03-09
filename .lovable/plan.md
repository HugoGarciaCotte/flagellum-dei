

## Allow adding extra subfeats beyond metadata-defined slots

### Problem
On line 635 of `CharacterFeatPicker.tsx`, the "add more" button logic is:
```ts
const canAddMore = !metaSlots && currentCount < MAX_SUBFEATS;
```
When an archetype has metadata-defined subfeat slots (`metaSlots` is not null), the `+` button is hidden entirely. So once the 3 defined slots are filled, there's no way to add a 4th.

### Fix
**File: `src/components/CharacterFeatPicker.tsx`** (line 635)

Change the condition to always allow adding more subfeats up to `MAX_SUBFEATS`, regardless of whether metadata slots exist:
```ts
const canAddMore = currentCount < MAX_SUBFEATS;
```

This single-line change will show the `+` button below the metadata-defined slots when they're all filled, letting players add additional subfeats beyond the default 3.

