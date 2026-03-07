

## Auto-Prompt Subfeat Selection After Picking a Feat

### Problem
When a player picks a feat that has subfeats (list or type kind), they have to manually find and click the subfeat slots afterward. The user wants to be automatically prompted to pick subfeats right after selecting the parent feat.

### Current State
- Subfeats ARE already rendered and editable via `renderSubfeats()` in `CharacterFeatPicker.tsx`
- Fixed subfeats are auto-inserted in `upsertMutation`
- But list/type subfeats require manual interaction after the picker closes

### Changes (single file: `src/components/CharacterFeatPicker.tsx`)

**1. Track pending subfeat slots after feat selection**
- Add state: `pendingSubfeatSlots` — a queue of `{ characterFeatId, slot }` entries to prompt
- After `upsertMutation` succeeds for a feat with non-fixed subfeats, populate this queue instead of closing the picker

**2. Modify `upsertMutation.onSuccess`**
- After inserting the feat, check if the selected feat has list/type subfeat slots
- If yes, set `pendingSubfeatSlots` with those slots and immediately open the picker for the first one
- If no non-fixed subfeats, close as normal

**3. Modify `setSubfeatMutation.onSuccess`**
- After a subfeat is picked, check if there are remaining pending slots
- If yes, auto-open picker for the next slot
- If no more, close the picker

**4. Same behavior for free feats (`addFreeFeatMutation`)**
- Apply the same logic — after adding a free feat with subfeats, prompt for subfeat selection

### Flow
```text
User picks "Feat X" (has 2 subfeats: list + type)
  → Feat inserted, fixed subfeats auto-inserted
  → Picker stays open, switches to "Choose Subfeat — Slot 1"
  → User picks subfeat 1
  → Picker switches to "Choose Subfeat — Slot 2"  
  → User picks subfeat 2
  → Picker closes
```

### Files changed
- `src/components/CharacterFeatPicker.tsx` — add pending subfeat queue logic to mutations

