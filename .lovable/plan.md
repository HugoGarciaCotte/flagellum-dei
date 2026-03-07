

## Add Feat Categories (Types) + Delete All Existing Feats

### 1. Database: Add `categories` column to `feats` table

Add a `text[]` (text array) column to store multiple category tags per feat.

```sql
ALTER TABLE public.feats ADD COLUMN categories text[] NOT NULL DEFAULT '{}';
```

### 2. Delete all existing feats

Using the insert/data tool:
```sql
DELETE FROM public.feats;
```

### 3. Edge Function: Update `import-wiki-feats/index.ts`

During import, fetch 5 additional category member lists in parallel alongside the existing Feats + Official fetches:
- `Archetypes` → `"Archetype"`
- `Prowesses` → `"Prowess"`
- `General Feats` → `"General Feat"`
- `Hidden` → `"Hidden Feat"`
- `Dark Feats` → `"Dark Feat"`

Build a `Map<string, string[]>` mapping each feat title to its matched categories. Store this array in the `categories` column on insert/update.

Include categories in preview items too so the UI can show them.

### 4. UI: Show category badges everywhere feats appear

Create a shared helper component `FeatCategoryBadges` that maps category strings to colored badges:

| Category | Color |
|---|---|
| Archetype | Green (`emerald`) |
| Prowess | Yellow (`amber`) |
| General Feat | Blue (`blue`) |
| Hidden Feat | Gray (`zinc`) |
| Dark Feat | Violet (`violet`) |

Update these components to display the badges:
- **`ImportFeatsCard.tsx`** — show categories next to feat title in preview table
- **`ManageFeats.tsx`** — show categories next to feat title in the management table

### 5. Files changed

- `supabase/migrations/` — new migration for `categories` column
- `supabase/functions/import-wiki-feats/index.ts` — fetch category memberships, store in DB
- `src/components/FeatCategoryBadges.tsx` — new shared badge component
- `src/components/ImportFeatsCard.tsx` — display categories in preview
- `src/components/ManageFeats.tsx` — display categories in list

