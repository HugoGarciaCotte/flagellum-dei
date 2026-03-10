
-- Fix character_feat_subfeats host policies to join through characters.user_id

DROP POLICY IF EXISTS "Host can view game player character feat subfeats" ON public.character_feat_subfeats;
DROP POLICY IF EXISTS "Host can insert game player character feat subfeats" ON public.character_feat_subfeats;
DROP POLICY IF EXISTS "Host can update game player character feat subfeats" ON public.character_feat_subfeats;
DROP POLICY IF EXISTS "Host can delete game player character feat subfeats" ON public.character_feat_subfeats;

CREATE POLICY "Host can view game player character feat subfeats" ON public.character_feat_subfeats
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM character_feats cf
      JOIN characters c ON c.id = cf.character_id
      JOIN game_players gp ON gp.user_id = c.user_id
      JOIN games g ON g.id = gp.game_id
      WHERE cf.id = character_feat_subfeats.character_feat_id
        AND g.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Host can insert game player character feat subfeats" ON public.character_feat_subfeats
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_feats cf
      JOIN characters c ON c.id = cf.character_id
      JOIN game_players gp ON gp.user_id = c.user_id
      JOIN games g ON g.id = gp.game_id
      WHERE cf.id = character_feat_subfeats.character_feat_id
        AND g.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Host can update game player character feat subfeats" ON public.character_feat_subfeats
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM character_feats cf
      JOIN characters c ON c.id = cf.character_id
      JOIN game_players gp ON gp.user_id = c.user_id
      JOIN games g ON g.id = gp.game_id
      WHERE cf.id = character_feat_subfeats.character_feat_id
        AND g.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Host can delete game player character feat subfeats" ON public.character_feat_subfeats
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM character_feats cf
      JOIN characters c ON c.id = cf.character_id
      JOIN game_players gp ON gp.user_id = c.user_id
      JOIN games g ON g.id = gp.game_id
      WHERE cf.id = character_feat_subfeats.character_feat_id
        AND g.host_user_id = auth.uid()
    )
  );
