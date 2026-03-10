
-- Fix character_feats host policies to join through characters.user_id instead of game_players.character_id

DROP POLICY IF EXISTS "Host can view game player character feats" ON public.character_feats;
DROP POLICY IF EXISTS "Host can insert game player character feats" ON public.character_feats;
DROP POLICY IF EXISTS "Host can update game player character feats" ON public.character_feats;
DROP POLICY IF EXISTS "Host can delete game player character feats" ON public.character_feats;

CREATE POLICY "Host can view game player character feats" ON public.character_feats
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN game_players gp ON gp.user_id = c.user_id
      JOIN games g ON g.id = gp.game_id
      WHERE c.id = character_feats.character_id
        AND g.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Host can insert game player character feats" ON public.character_feats
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN game_players gp ON gp.user_id = c.user_id
      JOIN games g ON g.id = gp.game_id
      WHERE c.id = character_feats.character_id
        AND g.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Host can update game player character feats" ON public.character_feats
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN game_players gp ON gp.user_id = c.user_id
      JOIN games g ON g.id = gp.game_id
      WHERE c.id = character_feats.character_id
        AND g.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Host can delete game player character feats" ON public.character_feats
  FOR DELETE TO public USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN game_players gp ON gp.user_id = c.user_id
      JOIN games g ON g.id = gp.game_id
      WHERE c.id = character_feats.character_id
        AND g.host_user_id = auth.uid()
    )
  );
