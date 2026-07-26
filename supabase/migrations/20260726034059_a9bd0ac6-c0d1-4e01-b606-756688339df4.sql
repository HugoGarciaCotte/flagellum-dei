
-- =========================================================================
-- CROSS-04 bundle: realtime publication, host UPDATE widening,
-- deleted_at-aware helpers, join_game_by_code hardening, unique join_code
-- =========================================================================

-- SYNC-05: enable realtime for the tables the client subscribes to
ALTER TABLE public.games        REPLICA IDENTITY FULL;
ALTER TABLE public.game_players REPLICA IDENTITY FULL;
ALTER TABLE public.characters   REPLICA IDENTITY FULL;
ALTER TABLE public.profiles     REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- SRV-02 / SRV-04: helpers now filter deleted_at and (for host access) require
-- an active, non-deleted game so revoking access is real.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_game_member(_game_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = _game_id AND user_id = _user_id AND deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_game_host(_game_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games
    WHERE id = _game_id AND host_user_id = _user_id AND deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_host_of_player(_player_user uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
      AND g.host_user_id = _viewer
      AND g.deleted_at IS NULL
      AND g.status <> 'ended'
    WHERE gp.user_id = _player_user
      AND gp.deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_host_of_character(_character_id uuid, _viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
      AND g.host_user_id = _viewer
      AND g.deleted_at IS NULL
      AND g.status <> 'ended'
    WHERE gp.character_id = _character_id
      AND gp.deleted_at IS NULL
  )
$$;

-- SYNC-04: widen host UPDATE policy on characters to match SELECT scope
DROP POLICY IF EXISTS "Host can update game player characters" ON public.characters;
CREATE POLICY "Host can update game player characters"
ON public.characters
FOR UPDATE
TO authenticated
USING (public.is_host_of_player(user_id, auth.uid()))
WITH CHECK (public.is_host_of_player(user_id, auth.uid()));

-- SRV-03: join_game_by_code ignores deleted games and resurrects soft-deleted memberships
CREATE OR REPLACE FUNCTION public.join_game_by_code(_code text)
RETURNS public.games
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _game public.games;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _game FROM public.games
  WHERE join_code = upper(_code)
    AND status = 'active'
    AND deleted_at IS NULL
  LIMIT 1;

  IF _game.id IS NULL THEN
    RAISE EXCEPTION 'Game not found' USING ERRCODE = 'P0002';
  END IF;

  -- Ensure the unique constraint exists before we rely on it in ON CONFLICT.
  -- (P3-14 safety.)
  INSERT INTO public.game_players (game_id, user_id)
  VALUES (_game.id, auth.uid())
  ON CONFLICT (game_id, user_id) DO UPDATE SET deleted_at = NULL;

  RETURN _game;
END;
$$;

-- P3-14: unique join_code (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'games_join_code_key'
  ) THEN
    ALTER TABLE public.games ADD CONSTRAINT games_join_code_key UNIQUE (join_code);
  END IF;
EXCEPTION WHEN others THEN
  -- If duplicates already exist we can't add the constraint; log and continue.
  RAISE NOTICE 'Could not add games_join_code_key: %', SQLERRM;
END $$;

-- Ensure the (game_id, user_id) unique constraint exists on game_players
-- (join_game_by_code's ON CONFLICT relies on it).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_players_game_id_user_id_key'
  ) THEN
    ALTER TABLE public.game_players
      ADD CONSTRAINT game_players_game_id_user_id_key UNIQUE (game_id, user_id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add game_players_game_id_user_id_key: %', SQLERRM;
END $$;
