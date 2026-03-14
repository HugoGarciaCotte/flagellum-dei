

## Plan: DB-backed scenario overrides + background tag inserter

### Concept

Mirror the feat_overrides pattern: scenario edits are saved to a `scenario_overrides` table keyed by `scenario_id` + `field`. DB values override hardcoded scenarios at runtime. Download exports merged `scenarios.ts` and clears the DB. Add a wikitext helper toolbar to insert `<!--@ background_image: URL @-->` tags into the content editor.

### 1. Create `scenario_overrides` table

```sql
CREATE TABLE public.scenario_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id text NOT NULL,
  field text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, field)
);
ALTER TABLE public.scenario_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage scenario overrides"
  ON public.scenario_overrides FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Anyone can read scenario overrides"
  ON public.scenario_overrides FOR SELECT TO anon, authenticated
  USING (true);
```

Fields: `title`, `description`, `level`, `content` — each stored as a separate row with JSONB value.

### 2. New `src/lib/scenarioOverrides.ts`

Same pattern as `featOverrides.ts`:
- `loadScenarioOverrides()` — fetch from DB, cache in memory
- `getCachedScenarioOverrides()` / `invalidateScenarioOverrides()`
- `applyScenarioOverrides(scenario, overrides)` — merge DB values on top of hardcoded

### 3. Update `src/data/scenarios.ts`

Update `getAllScenarios()` and `getScenarioById()` to apply cached overrides (same as feats).

### 4. Rewrite `ScenarioEditorPanel.tsx`

Mirror FeatEditorPanel pattern:
- On mount, fetch all `scenario_overrides` rows
- Each field edit saves to DB on confirm (like feat editor's OverrideField pattern)
- "Modified" badge on scenarios with DB overrides
- Override banner showing count of modified scenarios
- **Download & Clear DB** button: exports merged `scenarios.ts`, clears `scenario_overrides`
- **Background tag inserter**: A small toolbar above the content textarea with:
  - A URL input + "Insert Background" button
  - Inserts `<!--@ background_image: <url> @-->` at the cursor position in the content textarea
  - Could also offer a dropdown of images from the `app-assets` storage bucket

### 5. Add `loadScenarioOverrides()` to App.tsx init

Same as `loadFeatOverrides()` — non-blocking call on app startup.

### 6. i18n keys

Add keys to `en.ts`: `adminScenarios.modified`, `adminScenarios.overrideBanner`, `adminScenarios.downloadJsonClearDb`, `adminScenarios.insertBackground`, `adminScenarios.backgroundUrl`, `adminScenarios.saveFailed`, `adminScenarios.revertFailed`, `adminScenarios.downloadedCleared`, `adminScenarios.downloadedClearedDesc`, `adminScenarios.revert`, `adminScenarios.dbOverrideRevert`.

### Files changed
- **New migration** — `scenario_overrides` table + RLS
- **New** `src/lib/scenarioOverrides.ts`
- **Edit** `src/data/scenarios.ts` — integrate override layer
- **Rewrite** `src/components/ScenarioEditorPanel.tsx` — DB-backed editing + background inserter
- **Edit** `src/App.tsx` — add `loadScenarioOverrides()` init
- **Edit** `src/i18n/en.ts` — add new keys

