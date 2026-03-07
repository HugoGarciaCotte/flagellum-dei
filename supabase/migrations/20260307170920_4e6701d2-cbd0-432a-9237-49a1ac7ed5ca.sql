ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.game_players
  ADD CONSTRAINT game_players_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;