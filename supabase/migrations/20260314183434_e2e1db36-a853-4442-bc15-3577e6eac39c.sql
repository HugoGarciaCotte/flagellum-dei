
-- Add updated_at and deleted_at to character_feats
ALTER TABLE public.character_feats
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TRIGGER update_character_feats_updated_at
  BEFORE UPDATE ON public.character_feats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at and deleted_at to character_feat_subfeats
ALTER TABLE public.character_feat_subfeats
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TRIGGER update_character_feat_subfeats_updated_at
  BEFORE UPDATE ON public.character_feat_subfeats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at and deleted_at to game_players
ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TRIGGER update_game_players_updated_at
  BEFORE UPDATE ON public.game_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at and deleted_at to user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add deleted_at to tables that already have updated_at
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
