-- Allow game hosts to view characters of players in their games
CREATE POLICY "Host can view game player characters"
ON public.characters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
    WHERE gp.character_id = characters.id
      AND g.host_user_id = auth.uid()
  )
);

-- Allow game hosts to update characters of players in their games
CREATE POLICY "Host can update game player characters"
ON public.characters
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
    WHERE gp.character_id = characters.id
      AND g.host_user_id = auth.uid()
  )
);