CREATE OR REPLACE FUNCTION public.is_game_member(_game_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = _game_id AND user_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_game_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_game_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Host and members can view game players" ON public.game_players;

CREATE POLICY "Host and members can view game players"
ON public.game_players
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_players.game_id
      AND g.host_user_id = auth.uid()
  )
  OR public.is_game_member(game_players.game_id, auth.uid())
);
