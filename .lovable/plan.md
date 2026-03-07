

## Free Feats + GM Full Feat Access

### 1. Database Migration

Add `is_free` boolean column and adjust constraints + RLS:

```sql
-- Add is_free flag
ALTER TABLE public.character_feats ADD COLUMN is_free boolean NOT NULL DEFAULT false;

-- Drop existing unique constraint (character_id, level) and replace with partial one
-- so free feats (level doesn't matter) don't conflict
ALTER TABLE public.character_feats DROP CONSTRAINT character_feats_character_id_level_key;
CREATE UNIQUE INDEX character_feats_level_unique ON public.character_feats (character_id, level) WHERE is_free = false;

-- GM (host) can insert/update/delete character feats for players in their game
CREATE POLICY "Host can insert game player character feats"
  ON public.character_feats FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM game_players gp JOIN games g ON g.id = gp.game_id
    WHERE gp.character_id = character_feats.character_id AND g.host_user_id = auth.uid()
  ));

CREATE POLICY "Host can update game player character feats"
  ON public.character_feats FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM game_players gp JOIN games g ON g.id = gp.game_id
    WHERE gp.character_id = character_feats.character_id AND g.host_user_id = auth.uid()
  ));

CREATE POLICY "Host can delete game player character feats"
  ON public.character_feats FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM game_players gp JOIN games g ON g.id = gp.game_id
    WHERE gp.character_id = character_feats.character_id AND g.host_user_id = auth.uid()
  ));
```

### 2. Update `CharacterFeatPicker` component

Add props to support GM mode:
- `mode?: "player" | "gm"` (default `"player"`)
- In **player mode** (current behavior): level-based feats with Archetype/General Feat/Prowess filtering, no hidden feats. Below the level rows, show a read-only "Free Feats" section if any exist (just name + badges, no edit/delete buttons).
- In **GM mode**: level-based feats show ALL feats (no category filtering). Plus a "Free Feats" section where the GM can add/remove feats from the full unfiltered list.

### 3. Update `PlayerListSheet` (GM view)

When the GM clicks edit on a player's character, show `CharacterFeatPicker` with `mode="gm"` so the GM can:
- Edit level-based feats with access to all feats (including Dark, Hidden)
- Add/remove free feats

### 4. Update `PlayGame` (player view)

The existing `CharacterFeatPicker` already renders in player mode. It will now also show a read-only free feats section when the character has free feats granted by the GM.

### Files changed
- `supabase/migrations/` — new migration for `is_free` column + GM RLS policies
- `src/components/CharacterFeatPicker.tsx` — add GM mode, free feats section
- `src/components/PlayerListSheet.tsx` — integrate CharacterFeatPicker in GM mode

