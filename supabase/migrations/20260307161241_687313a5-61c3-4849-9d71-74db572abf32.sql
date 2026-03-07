-- Drop existing triggers if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_owner ON public.profiles;

-- 1. Create trigger for auto-creating profiles on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix the owner assignment function to use NEW.user_id
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

-- 3. Create trigger on profiles for owner assignment
CREATE TRIGGER on_auth_user_created_assign_owner
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_owner_if_first();