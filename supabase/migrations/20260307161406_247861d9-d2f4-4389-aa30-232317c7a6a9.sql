-- 1. Add current_section column to games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_section text DEFAULT NULL;

-- 2. Create profile trigger on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix owner assignment function
CREATE OR REPLACE FUNCTION public.assign_owner_if_first()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Create owner assignment trigger on profiles
CREATE OR REPLACE TRIGGER on_auth_user_created_assign_owner
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_owner_if_first();