CREATE POLICY "Host can view all characters of game players"
ON public.characters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_players gp
    JOIN games g ON g.id = gp.game_id
    WHERE gp.user_id = characters.user_id
    AND g.host_user_id = auth.uid()
  )
);