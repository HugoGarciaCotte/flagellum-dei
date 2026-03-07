
ALTER TABLE public.character_feats ADD COLUMN is_free boolean NOT NULL DEFAULT false;

ALTER TABLE public.character_feats DROP CONSTRAINT character_feats_character_id_level_key;
CREATE UNIQUE INDEX character_feats_level_unique ON public.character_feats (character_id, level) WHERE is_free = false;

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
