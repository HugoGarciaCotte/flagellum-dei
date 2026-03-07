

## Import Feats from Wiki

### 1. Database: Create `feats` table (migration)

```sql
CREATE TABLE public.feats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  content text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feats" ON public.feats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert feats" ON public.feats FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update feats" ON public.feats FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete feats" ON public.feats FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));
```

### 2. Edge Function: `supabase/functions/import-wiki-feats/index.ts`

Mirrors `import-wiki-scenarios` but with different wiki query logic:
- Fetch pages in `Category:Feats` and `Category:Official` separately
- Intersect the two lists (only pages in BOTH categories)
- Compare against existing `feats` table rows by title
- Preview mode returns new/modified/unchanged status; execute mode upserts

### 3. Admin UI: Add feats import card + ManageFeats component

**`src/pages/Admin.tsx`**: Add a second import card for feats (identical pattern to scenarios import card) calling `import-wiki-feats`, plus render a `<ManageFeats />` component below it.

**`src/components/ManageFeats.tsx`**: Clone of `ManageScenarios` but operating on the `feats` table. Provides CRUD table with edit/delete dialogs, same structure with title, description, and content fields.

### 4. Config: `supabase/config.toml`

Add `verify_jwt = false` for the new edge function (same pattern as existing function).

