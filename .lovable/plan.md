

## Feat Speciality System

### Overview
Add a speciality system where certain feats (like Combat) require the player to pick a speciality from a predefined list. The AI import detects which feats have specialities and stores the options. Players see a dropdown instead of a free-text note field. Feats without specialities have no note field at all.

### Database Change
Add a `specialities` column to the `feats` table — a nullable text array storing the list of valid speciality options (e.g. `["Swords", "Axes", "Bows"]`). When null or empty, the feat has no speciality.

```sql
ALTER TABLE public.feats ADD COLUMN specialities text[] DEFAULT NULL;
```

The existing `character_feats.note` column will store the chosen speciality value. No new table needed.

### AI Import — Edge Function Changes

#### `supabase/functions/import-wiki-feats/index.ts`
- Add a new `generateSpecialities` function that calls the AI gateway with tool calling.
- System prompt: "You are a TRPG feat analyzer. Some feats require the player to choose a speciality (e.g. Combat requires choosing a weapon/fighting style speciality). Analyze the feat content and determine if it has specialities. Return the list of speciality options, or an empty array if none."
- Tool schema returns `{ specialities: string[] }`.
- Call this alongside description/subfeats generation during import.
- Store the result in the `specialities` column on upsert.

#### `supabase/functions/regenerate-description/index.ts`
- Add a `regenerate_specialities` action that re-runs speciality detection for a single feat.
- Or bundle it into the existing regeneration flow.

### Admin Panel — `src/components/ManageFeats.tsx`
- Add a `StatusIcon` for "Specialities" next to the existing Description/Content/Subfeats indicators.
- In the expanded detail view, show the speciality list if present (e.g. "Specialities: Swords, Axes, Bows").
- Show "None detected" if the array is empty/null.

### Player Feat Picker — `src/components/CharacterFeatPicker.tsx`
- Update the `Feat` type to include `specialities: string[] | null`.
- When rendering an assigned feat in the level/free sections:
  - If `feat.specialities` has items: show a `Select` dropdown (populated from `feat.specialities`) instead of the note `Input`. The selected value is stored in `character_feats.note`.
  - If `feat.specialities` is empty/null: show nothing (remove the note field entirely).
- When picking a feat that has specialities, after selection prompt the user to choose a speciality via a Select dropdown before confirming.

### Feat List Item — `src/components/FeatListItem.tsx`
- Remove the generic `onNoteChange`/`onNoteBlur`/`noteValue` props since notes are being removed for non-speciality feats.
- Add a `specialityValue` prop and `onSpecialityChange` callback with the list of options.
- When `specialities` are provided, render a Select dropdown. When not, render nothing (or just show the chosen speciality as read-only text in GM mode).

### Files Changed
1. **Migration** — Add `specialities text[]` column to `feats`
2. **`supabase/functions/import-wiki-feats/index.ts`** — Add `generateSpecialities()`, call during import, include in upsert payload
3. **`supabase/functions/regenerate-description/index.ts`** — Add speciality regeneration support
4. **`src/components/ManageFeats.tsx`** — Show speciality status and list in admin view
5. **`src/components/FeatListItem.tsx`** — Replace note field with speciality Select when applicable, remove note field otherwise
6. **`src/components/CharacterFeatPicker.tsx`** — Update Feat type, pass speciality props instead of note props, prompt speciality selection on feat pick

