GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_game_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_game_host(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_host_of_player(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_host_of_character(uuid, uuid) TO authenticated;