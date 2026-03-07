

## Scenario Level-Based Feat Visibility

### Two changes needed:

**1. Expose scenario level to PlayGame**

Currently PlayGame only fetches `scenarios(title)`. It needs the scenario level to pass to `CharacterFeatPicker`. Options:
- Add a `level` column to the `scenarios` table and populate it during import (cleanest)
- Or fetch scenario content and parse it client-side (wasteful)

Best approach: Add `level` integer column to `scenarios` table, extract it during import from `<!--@ scenario_level: X @-->` in the wiki content, and use it in PlayGame.

- **Migration**: `ALTER TABLE scenarios ADD COLUMN level integer;`
- **Scenario import edge function**: After fetching wiki content, parse `<!--@ scenario_level: (\d+) @-->` and store it in the `level` column during insert/update.
- **PlayGame query**: Change `scenarios(title)` to `scenarios(title, level)` so the player has access to the scenario level.

**2. Update CharacterFeatPicker to support level-based dimming**

- Add optional `scenarioLevel` prop to `CharacterFeatPicker`
- When `scenarioLevel` is provided:
  - Level feats above `scenarioLevel` render with reduced opacity and greyed out styling (e.g., `opacity-40 text-muted-foreground`)
  - Free feats are always shown as active regardless of scenario level
  - The level badge for inactive levels also appears dimmed
- No functional change — all feats still display, just visually distinguished

**3. Pass scenarioLevel in PlayGame**

- Read `level` from the fetched scenario data
- Pass `scenarioLevel={scenarioLevel}` to `CharacterFeatPicker`

### Files changed
- `supabase/migrations/` — add `level` column to `scenarios`
- `supabase/functions/import-wiki-scenarios/index.ts` — extract and store `scenario_level` from content metadata
- `src/pages/PlayGame.tsx` — fetch `scenarios(title, level)`, pass `scenarioLevel` to `CharacterFeatPicker`
- `src/components/CharacterFeatPicker.tsx` — add `scenarioLevel` prop, dim feats above that level (free feats exempt)

