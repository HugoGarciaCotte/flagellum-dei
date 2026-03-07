

## Plan: Fix Database for GM Section Navigation

The section navigation code (WikiSectionTree, HostGame, PlayGame) already exists in the codebase. However, the database is missing critical pieces that prevent both signup and the section feature from working.

### Problem
Looking at the current database state:
- The `games` table has **no `current_section` column** — the earlier migration was never applied
- There are **no triggers** in the database — the trigger migration also failed
- Without these, signup fails (no profile created) and the GM can't set the active section

### Fix — Single Database Migration

One migration to add everything:

```sql
-- 1. Add current_section column to games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_section text DEFAULT NULL;

-- 2. Enable realtime for games
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- 3. Create profile trigger on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix owner assignment function
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

-- 5. Create owner assignment trigger on profiles
CREATE OR REPLACE TRIGGER on_auth_user_created_assign_owner
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_owner_if_first();
```

No code changes needed — the UI components already handle everything once the database column and triggers exist.

### Files
| Item | Action |
|---|---|
| Database migration | Add `current_section` column + triggers |

