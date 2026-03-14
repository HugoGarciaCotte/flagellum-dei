

## Plan: Extract all remaining hardcoded strings to i18n

### Scope

After two previous passes, the remaining hardcoded user-facing strings fall into two groups:

**A. Player-facing components (4 strings)**

| File | String | Proposed key |
|---|---|---|
| `FullPageLoader.tsx:5` | `"Loading..."` (default prop) | `common.loading` |
| `BrandTitle.tsx:14` | `"Flagellum Dei"` | Reuse `dashboard.appTitle` |
| `PlayGame.tsx:132` | `"A player"` (DiceRoller fallback) | `game.aPlayer` |
| `HostGame.tsx:158` | `"Game Master"` (DiceRoller userName) | `game.gameMaster` |

**B. Admin tool components (~60 strings across 7 files)**

These were previously skipped as "internal tools," but should be translated for consistency. The files and approximate string counts:

| File | ~Strings | Examples |
|---|---|---|
| `FeatEditorPanel.tsx` | ~25 | "Feats", "Search feats...", "Modified", "Generate with AI:", "Generate All Missing", "Stop", "Download JSON & Clear DB", "Generate All Empty", "Title", "Categories (comma-separated)", "Subfeat Slots", "Revert", "Add Slot", "DB override — click to revert", toast messages |
| `AdminTranslations.tsx` | ~15 | "Generating...", "Generate All Missing", "Download JSON & Clear DB", "keys", "translated", "MISSING", "Copied to clipboard", "Copy Prompt", "Hardcoded String Audit Prompt", banner text |
| `ScenarioEditorPanel.tsx` | ~10 | "New Scenario", "Download scenarios.ts", "Add Scenario", field labels |
| `ManageScenarios.tsx` | ~6 | "Manage Scenarios", "No scenarios.", "Title", "Level", "Description" |
| `ManageRedirects.tsx` | ~7 | "Wiki Redirects", "Stored Redirects", "From", "To", count labels |
| `ImportFeatsCard.tsx` | ~3 | "Import Feats from Wiki", "Check for Updates" |
| `SubfeatSlotEditor.tsx` | ~6 | "Slot", field labels ("Kind", "Filter", "Fixed title") |

### Implementation

1. **Add ~70 new keys to `src/i18n/en.ts`** under sections:
   - `common.*` — shared strings (loading)
   - `game.*` — player/GM role labels
   - `adminFeats.*` — feat editor strings
   - `adminTranslations.*` — translation manager strings  
   - `adminScenarios.*` — scenario editor strings
   - `adminLegacy.*` — legacy import cards (ManageScenarios, ImportFeatsCard, ManageRedirects)

2. **Update each component** — add `useTranslation` import and replace hardcoded strings with `t()` calls.

3. **Special cases**:
   - `FullPageLoader` receives `message` as a prop — change the default from `"Loading..."` to use a fallback. Since it's not a hook component at the prop default level, callers already pass translated messages. We just need the default to be translatable — wrap the component body to use `useTranslation` and fall back to `t("common.loading")` when no message prop is provided.
   - `BrandTitle` — use `t("dashboard.appTitle")` (already exists).
   - `FeatEditorPanel` FIELD_LABELS constant — convert to a function that takes `t` and returns the map.

### Files changed
- `src/i18n/en.ts` — add ~70 keys
- `src/components/FullPageLoader.tsx`
- `src/components/BrandTitle.tsx`
- `src/pages/PlayGame.tsx`
- `src/pages/HostGame.tsx`
- `src/components/FeatEditorPanel.tsx`
- `src/pages/AdminTranslations.tsx`
- `src/components/ScenarioEditorPanel.tsx`
- `src/components/ManageScenarios.tsx`
- `src/components/ManageRedirects.tsx`
- `src/components/ImportFeatsCard.tsx`
- `src/components/SubfeatSlotEditor.tsx`

