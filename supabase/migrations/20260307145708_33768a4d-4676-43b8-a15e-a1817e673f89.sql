
-- 1. Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users can read their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: only owner can manage roles
CREATE POLICY "Owner can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- 2. Auto-assign 'owner' to first user who signs up
CREATE OR REPLACE FUNCTION public.assign_owner_if_first()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_owner
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_owner_if_first();

-- 3. Add content column to scenarios, drop scenario_sections
ALTER TABLE public.scenarios ADD COLUMN content text;

-- Remove current_section_id FK and column from games
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_current_section_id_fkey;
ALTER TABLE public.games DROP COLUMN IF EXISTS current_section_id;

-- Drop scenario_sections table
DROP TABLE IF EXISTS public.scenario_sections;
