

## Plan: Fix Signup — Missing Triggers + Wrong Column Reference

### Root Cause
Two problems prevent signup from working:

1. **No trigger on `auth.users`** — The `handle_new_user()` function exists but has no trigger attached, so profiles are never auto-created on signup.
2. **No trigger on `profiles`** — The `assign_owner_if_first()` trigger doesn't exist in the DB. Additionally, the function references `NEW.id` (the profile row UUID) instead of `NEW.user_id` (the actual auth user ID).

### Fix — Single Database Migration

```sql
-- 1. Create trigger for auto-creating profiles on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix the owner assignment function to use NEW.user_id (profiles.user_id)
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

-- 3. Recreate the trigger on profiles
CREATE TRIGGER on_auth_user_created_assign_owner
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_owner_if_first();
```

No code file changes needed — this is purely a database fix.

