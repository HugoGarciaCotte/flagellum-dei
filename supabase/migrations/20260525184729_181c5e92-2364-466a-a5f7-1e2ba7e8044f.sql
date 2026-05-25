
-- 1. Spotify tokens table
CREATE TABLE public.user_spotify_tokens (
  user_id uuid PRIMARY KEY,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_spotify_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own spotify tokens"
  ON public.user_spotify_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Migrate existing tokens
INSERT INTO public.user_spotify_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
SELECT user_id, spotify_access_token, spotify_refresh_token, spotify_token_expires_at, now()
FROM public.profiles
WHERE spotify_refresh_token IS NOT NULL OR spotify_access_token IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS spotify_access_token;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS spotify_refresh_token;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS spotify_token_expires_at;

-- 2. Games SELECT lockdown
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;

CREATE POLICY "Host and players can view games"
  ON public.games
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = host_user_id
    OR EXISTS (
      SELECT 1 FROM public.game_players gp
      WHERE gp.game_id = games.id AND gp.user_id = auth.uid()
    )
  );

-- Helper RPC: lookup + join in one trusted call
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
  WHERE join_code = upper(_code) AND status = 'active'
  LIMIT 1;

  IF _game.id IS NULL THEN
    RAISE EXCEPTION 'Game not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.game_players (game_id, user_id)
  VALUES (_game.id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN _game;
END;
$$;

REVOKE ALL ON FUNCTION public.join_game_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_game_by_code(text) TO authenticated;

-- 3. game_players SELECT lockdown
DROP POLICY IF EXISTS "Anyone can view game players" ON public.game_players;

CREATE POLICY "Host and members can view game players"
  ON public.game_players
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_players.game_id AND g.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.game_players gp2
      WHERE gp2.game_id = game_players.game_id AND gp2.user_id = auth.uid()
    )
  );

-- 4. Storage: remove redundant authenticated upload policy on app-assets
DROP POLICY IF EXISTS "Authenticated upload to app-assets" ON storage.objects;

-- Prevent listing the app-assets bucket (clients can still GET by exact path via the public URL)
DROP POLICY IF EXISTS "Public read access on app-assets" ON storage.objects;

-- 5. Lock down SECURITY DEFINER functions from direct API exposure
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_owner_if_first() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
