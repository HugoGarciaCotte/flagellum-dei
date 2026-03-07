
-- Add subfeats JSONB column to feats table
ALTER TABLE public.feats ADD COLUMN subfeats jsonb DEFAULT null;

-- Create character_feat_subfeats table
CREATE TABLE public.character_feat_subfeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_feat_id uuid NOT NULL REFERENCES public.character_feats(id) ON DELETE CASCADE,
  slot integer NOT NULL CHECK (slot >= 1 AND slot <= 3),
  subfeat_id uuid NOT NULL REFERENCES public.feats(id),
  UNIQUE (character_feat_id, slot)
);

-- Enable RLS
ALTER TABLE public.character_feat_subfeats ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view own character feat subfeats
CREATE POLICY "Users can view own character feat subfeats"
ON public.character_feat_subfeats FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.character_feats cf
  JOIN public.characters c ON c.id = cf.character_id
  WHERE cf.id = character_feat_subfeats.character_feat_id AND c.user_id = auth.uid()
));

-- RLS: Users can insert own character feat subfeats
CREATE POLICY "Users can insert own character feat subfeats"
ON public.character_feat_subfeats FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.character_feats cf
  JOIN public.characters c ON c.id = cf.character_id
  WHERE cf.id = character_feat_subfeats.character_feat_id AND c.user_id = auth.uid()
));

-- RLS: Users can update own character feat subfeats
CREATE POLICY "Users can update own character feat subfeats"
ON public.character_feat_subfeats FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.character_feats cf
  JOIN public.characters c ON c.id = cf.character_id
  WHERE cf.id = character_feat_subfeats.character_feat_id AND c.user_id = auth.uid()
));

-- RLS: Users can delete own character feat subfeats
CREATE POLICY "Users can delete own character feat subfeats"
ON public.character_feat_subfeats FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.character_feats cf
  JOIN public.characters c ON c.id = cf.character_id
  WHERE cf.id = character_feat_subfeats.character_feat_id AND c.user_id = auth.uid()
));

-- RLS: Host can view game player character feat subfeats
CREATE POLICY "Host can view game player character feat subfeats"
ON public.character_feat_subfeats FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.character_feats cf
  JOIN public.game_players gp ON gp.character_id = cf.character_id
  JOIN public.games g ON g.id = gp.game_id
  WHERE cf.id = character_feat_subfeats.character_feat_id AND g.host_user_id = auth.uid()
));

-- RLS: Host can insert game player character feat subfeats
CREATE POLICY "Host can insert game player character feat subfeats"
ON public.character_feat_subfeats FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.character_feats cf
  JOIN public.game_players gp ON gp.character_id = cf.character_id
  JOIN public.games g ON g.id = gp.game_id
  WHERE cf.id = character_feat_subfeats.character_feat_id AND g.host_user_id = auth.uid()
));

-- RLS: Host can update game player character feat subfeats
CREATE POLICY "Host can update game player character feat subfeats"
ON public.character_feat_subfeats FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.character_feats cf
  JOIN public.game_players gp ON gp.character_id = cf.character_id
  JOIN public.games g ON g.id = gp.game_id
  WHERE cf.id = character_feat_subfeats.character_feat_id AND g.host_user_id = auth.uid()
));

-- RLS: Host can delete game player character feat subfeats
CREATE POLICY "Host can delete game player character feat subfeats"
ON public.character_feat_subfeats FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.character_feats cf
  JOIN public.game_players gp ON gp.character_id = cf.character_id
  JOIN public.games g ON g.id = gp.game_id
  WHERE cf.id = character_feat_subfeats.character_feat_id AND g.host_user_id = auth.uid()
));
