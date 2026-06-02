
-- Helper: is the user the host of a given game? SECURITY DEFINER bypasses RLS.
CREATE OR REPLACE FUNCTION public.is_game_host(_game_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games
    WHERE id = _game_id AND host_user_id = _user_id
  )
$$;

-- Helper: is _viewer the host of any game that _player_user is a member of?
CREATE OR REPLACE FUNCTION public.is_host_of_player(_player_user uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
    WHERE gp.user_id = _player_user
      AND g.host_user_id = _viewer
  )
$$;

-- Helper: is _viewer the host of the game that owns this character via game_players?
CREATE OR REPLACE FUNCTION public.is_host_of_character(_character_id uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
    WHERE gp.character_id = _character_id
      AND g.host_user_id = _viewer
  )
$$;

REVOKE ALL ON FUNCTION public.is_game_host(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_host_of_player(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_host_of_character(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_game_host(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_host_of_player(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_host_of_character(uuid, uuid) TO authenticated;

-- games: remove EXISTS subquery into game_players that re-triggers RLS
DROP POLICY IF EXISTS "Host and players can view games" ON public.games;
CREATE POLICY "Host and players can view games"
ON public.games
FOR SELECT
TO authenticated
USING (
  auth.uid() = host_user_id
  OR public.is_game_member(id, auth.uid())
);

-- game_players: remove EXISTS subquery into games that re-triggers RLS
DROP POLICY IF EXISTS "Host and members can view game players" ON public.game_players;
CREATE POLICY "Host and members can view game players"
ON public.game_players
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_game_host(game_id, auth.uid())
  OR public.is_game_member(game_id, auth.uid())
);

-- characters: replace recursive host policies with helper functions
DROP POLICY IF EXISTS "Host can view all characters of game players" ON public.characters;
DROP POLICY IF EXISTS "Host can view game player characters" ON public.characters;
DROP POLICY IF EXISTS "Host can update game player characters" ON public.characters;

CREATE POLICY "Host can view all characters of game players"
ON public.characters
FOR SELECT
TO authenticated
USING (public.is_host_of_player(user_id, auth.uid()));

CREATE POLICY "Host can update game player characters"
ON public.characters
FOR UPDATE
TO authenticated
USING (public.is_host_of_character(id, auth.uid()));
