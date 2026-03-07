
CREATE TABLE public.character_feats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  level integer NOT NULL,
  feat_id uuid NOT NULL REFERENCES public.feats(id) ON DELETE CASCADE,
  UNIQUE (character_id, level)
);

ALTER TABLE public.character_feats ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Host can view game player character feats"
  ON public.character_feats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM game_players gp JOIN games g ON g.id = gp.game_id
    WHERE gp.character_id = character_feats.character_id AND g.host_user_id = auth.uid()
  ));
