

## Manage Wiki Redirects in Admin Panel

### Problem
Wiki content contains links like `[[Handicap (lost faith)]]` that don't match any feat title. On the wiki, these pages are actually redirects (e.g., `#REDIRECT [[Handicap]]`). The tooltips currently show "Feat not found" for these.

### Approach

**1. New `feat_redirects` table**
```sql
CREATE TABLE public.feat_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_title text NOT NULL UNIQUE,
  to_title text NOT NULL
);
ALTER TABLE public.feat_redirects ENABLE ROW LEVEL SECURITY;
-- Anyone can read, admins can manage
```

**2. New admin component: `ManageRedirects.tsx`**
- Scans all feat `content` fields for `[[...]]` wiki links
- Compares link targets against known feat titles
- Shows unmatched links with a "Check Wiki" button that fetches the wiki page to detect `#REDIRECT [[Target]]`
- Allows importing detected redirects or manually editing `from_title → to_title`
- Displays existing redirects with edit/delete

**3. New edge function: `check-wiki-redirects/index.ts`**
- Accepts a list of page titles
- Fetches each from prima.wiki API
- Detects `#REDIRECT [[...]]` pattern in content
- Returns `{ title, redirect_to }` for each

**4. Update tooltip resolution in `WikiLinkedText.tsx` and `WikiSectionTree.tsx`**
- Query `feat_redirects` alongside feats (add to the existing `feats-map-for-links` query)
- When a link target isn't found in the feats map, check the redirects map and resolve to the target feat

**5. Add to Admin page**
- Import and render `ManageRedirects` below `ManageFeats` in `Admin.tsx`

### Files changed
- **Migration**: Create `feat_redirects` table with RLS
- `supabase/functions/check-wiki-redirects/index.ts` — new edge function
- `src/components/ManageRedirects.tsx` — new admin component
- `src/pages/Admin.tsx` — add ManageRedirects section
- `src/components/WikiLinkedText.tsx` — resolve redirects in feat lookup
- `src/components/WikiSectionTree.tsx` — resolve redirects in feat lookup

