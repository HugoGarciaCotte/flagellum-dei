

## Revive Parseable Fields for Archetype Subfeat Constraints

Currently, when picking a subfeat for an archetype, the picker shows **all feats** with no filtering. The parseable metadata (`<!--@ feat_subfeat:N: ... @-->`) already exists in feat content and defines constraints per slot — but the code that uses it is commented out.

### What changes

**`src/components/CharacterFeatPicker.tsx`**:

1. **Re-enable the `parseEmbeddedFeatMeta` import** (line 13) and the `SubfeatSlot` type.

2. **Build a metadata map** for archetype feats — parse `content` field for each feat to extract subfeat slot definitions. Only needed for Archetype feats.

3. **Update `PickerTarget` for subfeats** — change the `subfeat` variant to carry the `SubfeatSlot` metadata (if any) alongside the existing `characterFeatId` and numeric `slot`:
   ```ts
   | { type: "subfeat"; characterFeatId: string; slot: number; slotMeta?: SubfeatSlot }
   ```

4. **Filter `filteredFeats` when picking archetype subfeats** — if the picker target has `slotMeta`:
   - `kind: "fixed"` → only show the single feat matching `feat_title`
   - `kind: "list"` → only show feats whose titles are in `options[]`
   - `kind: "type"` → filter by category using `filter` string (supports `!Category` exclusion)
   - No `slotMeta` → show all feats (current behavior, for non-archetype parents or slots beyond what metadata defines)

5. **Update `renderSubfeats`** — when rendering slots for an archetype, use the parsed `subfeats` metadata to determine how many slots to show and pass `slotMeta` to `openPicker`. If metadata defines 4 fixed slots, show exactly those 4. If no metadata, fall back to current behavior (3 default empty slots + add button).

6. **Re-enable `featByTitle` map** (line 412-416) — needed to resolve `fixed` kind slots by title.

### No database or backend changes needed

The metadata already exists in feat `content` fields. This is purely a frontend filtering change.

