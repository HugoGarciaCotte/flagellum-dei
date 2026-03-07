

## Add Feat Selection Per Level to Character Creation

### Overview

Add a level-based feat picker to the character creation/edit dialog. Each level row lets the player choose either a feat or an archetype (if no archetype has been picked yet). Once an archetype is chosen at any level, the archetype option is locked out for other levels.

### 1. Database: New `character_feats` table

```sql
CREATE TABLE public.character_feats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  level integer NOT NULL,
  feat_id uuid NOT NULL REFERENCES public.feats(id) ON DELETE CASCADE,
  UNIQUE (character_id, level)
);

ALTER TABLE public.character_feats ENABLE ROW LEVEL SECURITY;

-- Users can manage their own character feats
CREATE POLICY "Users can view own character feats"
  ON public.character_feats FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.characters WHERE id = character_feats.character_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own character feats"
  ON public.character_feats FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.characters WHERE id = character_feats.character_id AND user_id = auth.uid()));

CREATE POLICY "Users can update own character feats"
  ON public.character_feats FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.characters WHERE id = character_feats.character_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own character feats"
  ON public.character_feats FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.characters WHERE id = character_feats.character_id AND user_id = auth.uid()));

-- Host can view player character feats
CREATE POLICY "Host can view game player character feats"
  ON public.character_feats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM game_players gp JOIN games g ON g.id = gp.game_id
    WHERE gp.character_id = character_feats.character_id AND g.host_user_id = auth.uid()
  ));
```

### 2. New component: `src/components/CharacterFeatPicker.tsx`

A self-contained component used inside the character create/edit dialog (Dashboard) and the PlayGame character sheet.

**Props**: `characterId: string` (only shown after character is saved, so we always have an ID)

**Behavior**:
- Fetches all feats from the `feats` table and the character's `character_feats` rows
- Renders level rows (1 through 10, or dynamically based on how many are filled + 1 empty)
- Each level row shows:
  - Level number badge
  - If a feat is assigned: feat name + category badges + edit/clear button
  - If empty: a selector UI

**Selector logic per level**:
- Check if any level already has an Archetype feat assigned (look up the feat's categories)
- If no archetype exists yet → show two tabs/buttons: "Archetype" and "Feat"
  - **Archetype**: shows a searchable list of feats with category `"Archetype"`
  - **Feat**: shows a searchable list of feats with categories `"General Feat"` or `"Prowess"` (excludes `"Hidden Feat"`)
- If archetype already exists → only show "Feat" option (General Feat + Prowess, not Hidden)
- When editing a level that already has an archetype, the user can change it freely (the archetype slot constraint only applies to *other* levels)

**Data flow**: On select, upsert into `character_feats` (character_id, level, feat_id). On clear, delete the row.

### 3. Update character dialog in `src/pages/Dashboard.tsx`

- After creating a character (which now returns the new ID), keep the dialog open and show the feat picker below the name/description fields
- When editing, show the feat picker below description
- The feat picker only appears when `characterId` is available (i.e., after first save)
- Add a "Create" step that saves name+description first, then reveals the feat picker

### 4. Update character sheet in `src/pages/PlayGame.tsx`

- When viewing the selected character, show its assigned feats per level below the description
- When creating a new character inline, after creation show the feat picker
- Reuse the same `CharacterFeatPicker` component

### 5. Update character cards in Dashboard

- On character cards, show a compact summary: e.g., "Level 3 · Archetype: Shadowblade" below the description

### Files changed
- `supabase/migrations/` — new migration for `character_feats` table + RLS
- `src/components/CharacterFeatPicker.tsx` — new component
- `src/pages/Dashboard.tsx` — integrate feat picker in character dialog
- `src/pages/PlayGame.tsx` — integrate feat picker in character sheet

