

## Fix: Stop Special-Casing Faith — Use Subfeat Slots Generically

### Problem
The wizard has a custom `faithInfo` detection (lines 112-136) that tries to guess which subfeat slot is "faith" by string-matching category names like `"Faith"`, `"Faith Feat"`, `"!Dark Feat"`. This is brittle and clearly not matching the actual data, so the faith step is always skipped.

Meanwhile, `resolveSubfeatOptions` (line 180) already handles all slot kinds (fixed, list, type with include/exclude filters) correctly — the same logic used in the feat picker.

### Solution
Remove the faith special-casing entirely. Treat all subfeat slots uniformly:
- After archetype selection, collect `archetypeMeta.subfeats` (already sorted by slot number)
- Each subfeat slot becomes a wizard step, resolved via `resolveSubfeatOptions`
- Steps become dynamic: step 1 = archetype, steps 2..N = one per subfeat slot, final step = name/description/portrait

### Changes to `src/components/CharacterCreationWizard.tsx`

1. **Remove** all faith-specific state and logic: `faithFeatId`, `faithSlot`, `faithInfo`, `faithFeats`, `darkFaithFeats`, `shouldSkipFaith`, and the step 2 faith-specific UI block

2. **Replace** `subfeat2Info`/`subfeat3Info` with a single array: derive `subfeatSlots` directly from `archetypeMeta?.subfeats ?? []`

3. **Replace** individual subfeat state (`subfeat2Id`, `subfeat3Id`, etc.) with a `Map<number, string | null>` keyed by slot number — `subfeatSelections`

4. **Dynamic step count**: 
   - Step 0 = welcome
   - Step 1 = archetype
   - Steps 2 through `1 + subfeatSlots.length` = one per subfeat slot (in order)
   - Final step = name/description/portrait
   - Use `resolveSubfeatOptions(slot)` for each — no faith-specific code needed

5. **Reuse `renderSubfeatStep`** for every subfeat slot, passing the slot info and resolved options. The "None"/"No Faith" option is already handled by `slotInfo.optional` or can always be offered.

6. **Update `saveSubfeat`** calls to use the slot number from the slot definition

7. **Update step 5 summary** to list all selected subfeats from the map

### Result
Every subfeat slot — whether it filters by "Faith", "Combat", or anything else — is handled identically using the filters already defined in the feat metadata. No more guessing.

