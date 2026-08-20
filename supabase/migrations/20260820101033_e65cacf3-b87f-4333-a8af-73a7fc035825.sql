CREATE OR REPLACE FUNCTION public.is_host_of_player(_player_user uuid, _viewer uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
      AND g.host_user_id = _viewer
      AND g.deleted_at IS NULL
    WHERE gp.user_id = _player_user
      AND gp.deleted_at IS NULL
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_host_of_character(_character_id uuid, _viewer uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
      AND g.host_user_id = _viewer
      AND g.deleted_at IS NULL
    WHERE gp.character_id = _character_id
      AND gp.deleted_at IS NULL
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_active_host_of_player(_player_user uuid, _viewer uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.is_active_host_of_player(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Host can update game player characters" ON public.characters;
CREATE POLICY "Host can update game player characters"
ON public.characters FOR UPDATE TO authenticated
USING (public.is_active_host_of_player(user_id, auth.uid()))
WITH CHECK (public.is_active_host_of_player(user_id, auth.uid()));