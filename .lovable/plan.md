

## Plan: DB-backed feat overrides (like translations)

### Concept
Mirror the translations pattern: edits are saved to a new `feat_overrides` DB table keyed by feat ID + field name. DB values override hardcoded JSON. Download exports merged data as `feats-data.json` and clears the DB.

### 1. Create `feat_overrides` table

```sql
CREATE TABLE public.feat_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feat_id text NOT NULL,
  field text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feat_id, field)
);

ALTER TABLE public.feat_overrides ENABLE ROW LEVEL SECURITY;

-- Only owners can manage
CREATE POLICY "Owner can manage feat overrides"
  ON public.feat_overrides FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Anyone can read (feats are public data)
CREATE POLICY "Anyone can read feat overrides"
  ON public.feat_overrides FOR SELECT TO public
  USING (true);
```

Fields stored: `title`, `categories`, `description`, `prerequisites`, `special`, `specialities`, `subfeats`, `unlocks_categories`, `blocking`, `synonyms`. Each as a separate row with JSONB value. `content` and `raw_content` are **not** editable — they stay as hardcoded backup only.

### 2. Rewrite `FeatEditorPanel`

- On mount, fetch all rows from `feat_overrides` and build a `Map<feat_id, Map<field, value>>`
- Merge DB overrides on top of hardcoded feats for display
- Each field edit auto-saves (or saves on blur/button) to `feat_overrides` via upsert
- Visual indicator (badge/dot) on feats that have DB overrides — "modified" vs "hardcoded"
- Remove `content`/`raw_content` text areas from the editor (kept as backup, not displayed)
- **Download JSON & Clear DB** button: exports the fully merged `feats-data.json` (hardcoded + overrides applied), then deletes all `feat_overrides` rows
- Show count of DB-modified feats in a banner (like the translations pending export banner)

### 3. Update `src/data/feats.ts` — runtime override layer

Add an optional override merge so the rest of the app (character wizard, feat picker, wiki tooltips) also sees DB overrides at runtime:

- New module `src/lib/featOverrides.ts`:
  - `loadFeatOverrides()` — fetches `feat_overrides` from Supabase, stores in memory
  - `getFeatWithOverrides(feat)` — applies overrides to a hardcoded feat
- Update `getAllFeats()` / `getFeatMeta()` / `buildFeatsMap()` to apply overrides if loaded
- Overrides are loaded once on app init (or lazily on first admin page visit)

### 4. Files changed

- **New migration** — `feat_overrides` table + RLS
- **New file** `src/lib/featOverrides.ts` — override loading/merging logic
- **Rewrite** `src/components/FeatEditorPanel.tsx` — DB-backed editing with auto-save, download & clear
- **Update** `src/data/feats.ts` — integrate override layer into `getAllFeats` / `getFeatMeta`

### Data flow

```text
feats-data.json (hardcoded)
        ↓
  feat_overrides table (DB, per-field)
        ↓ merge (DB wins)
  getAllFeats() / getFeatMeta()
        ↓
  Character Wizard / Feat Picker / Wiki Tooltips
```

Admin editor: edit field → upsert to `feat_overrides` → UI shows "modified" badge.
Download: merge hardcoded + overrides → export JSON → clear DB → all fields show as hardcoded again.

