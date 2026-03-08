

## Simplify Subfeat System & Add AI Validation on Every Feat Pick

### Overview

1. **Comment out** all preprocessed/parseable-field-driven logic (prerequisites, blocking, specialities, subfeat slots from metadata, category unlocks) in `CharacterFeatPicker`. Keep the code in place with clear `// COMMENTED OUT: preprocessed fields` markers for easy reactivation.

2. **New subfeat UX**: Under each assigned feat, show a small `+` button to add a subfeat slot (up to 4 total). If the feat is an Archetype, auto-show 3 empty subfeat slots by default. Subfeats are chosen from the full feat list via the existing picker flow.

3. **AI validation on every feat pick** (including subfeats): Before committing any feat selection, call the existing `validate-feat` edge function. If denied, show the AI's reason with a "Do it anyway" button. If allowed (or user overrides), proceed with the insert.

### Changes

#### 1. `src/components/CharacterFeatPicker.tsx` — Major refactor

**Comment out:**
- `metaMap` computation and all references to parsed metadata (prerequisites, blocking, specialities, unlocks_categories)
- `validateFeatLocally()` function
- `filterMode` / archetype toggle logic driven by metadata
- `renderSubfeats()` that reads from `metaMap` subfeat slots
- Filtering logic that uses `metaMap` (blocking filter, unlocked categories filter)
- `SubfeatSlot` import and the `subfeat` picker target type that references it
- `pendingSubfeatSlots` queue (auto-prompting for metadata-driven slots)
- Speciality dropdown logic (`localSpecialities`, `handleSpecialityChange`, `specialities` prop on FeatListItem)

**New subfeat system:**
- Keep `character_feat_subfeats` table usage but drive slots from UI, not metadata
- Under each assigned feat, render existing subfeats + a `+` button if count < 4
- For Archetype feats (check `feat.categories.includes("Archetype")`), default to 3 empty slots shown
- The `+` button opens the picker in a new subfeat target mode: `{ type: "subfeat"; characterFeatId: string; slot: number }`
- Subfeat picker shows all feats (full list, searchable)
- Slot number = next available (max existing slot + 1)

**AI validation flow:**
- New state: `validationResult: { allowed: boolean; reason: string; pendingAction: () => void } | null`
- Before any feat insert (level, free, or subfeat), call `supabase.functions.invoke("validate-feat", { body: { characterId, featId } })`
- Show a loading spinner while validating
- If `allowed: true` → proceed immediately
- If `allowed: false` → show an alert with the reason and a "Do it anyway" button
- "Do it anyway" executes the pending action, bypassing the result
- Handle 429/402 errors gracefully (toast + allow anyway)

#### 2. `supabase/functions/validate-feat/index.ts` — Minor update

- Also fetch subfeats and include them in the AI context so the AI sees the full picture
- Update the system prompt: remove references to "Parsed Prerequisites" and "Blocking" metadata fields since we're no longer relying on them. Instead tell the AI to read the feat content directly for any prerequisites/restrictions.

#### 3. Files left untouched but with commented references

- `src/lib/parseEmbeddedFeatMeta.ts` — keep as-is (used by ManageFeats admin, WikiLinkedText, FeatDetailsDisplay)
- `src/components/FeatDetailsDisplay.tsx` — still shows prerequisites/blocking for reading purposes
- `src/components/ManageFeats.tsx` — still uses parseable fields for admin management
- Edge functions for admin (check-feats-ai, regenerate-description, push-wiki-feats) — unchanged

