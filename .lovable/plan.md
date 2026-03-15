

## In-Game Content Translation (Override+Export Pattern)

### Concept
Add FR translations for feats and scenarios using the **same override → export → hardcode → clear DB** pattern already used for English content edits. Translations are stored in the existing `feat_overrides` and `scenario_overrides` tables (with a locale-prefixed field name like `fr:title`, `fr:description`). Each editor panel gets a 🇬🇧/🇫🇷 toggle. On export, FR translations are included in the downloaded files and the DB is cleared.

This avoids creating new tables — translations are just another kind of override.

### Database
**No new tables needed.** Reuse `feat_overrides` and `scenario_overrides` with field names prefixed by locale, e.g.:
- `fr:title`, `fr:teaser`, `fr:content` for scenarios
- `fr:title`, `fr:description`, `fr:prerequisites`, `fr:special` for feats

The existing RLS policies already cover these tables.

### Data Model Changes

**`src/data/scenarios.ts`** — Add optional `fr` field to `Scenario` interface:
```typescript
export interface Scenario {
  id: string;
  title: string;
  teaser: string | null;
  level: number | null;
  content: string | null;
  fr?: { title?: string; teaser?: string; content?: string };
}
```
Add `getAllScenarios(locale?)` — when locale is `fr`, apply `scenario.fr?.title ?? scenario.title` etc.

**`src/data/feats.ts`** — Add optional `fr` field to `FeatMeta`:
```typescript
// Inside FeatMeta or Feat:
fr?: { title?: string; description?: string; prerequisites?: string; special?: string };
```
Same locale-aware accessor pattern.

**`src/lib/scenarioOverrides.ts`** and **`src/lib/featOverrides.ts`** — Update `applyOverrides` to handle `fr:*` prefixed fields, populating the `fr` sub-object.

### Editor UI Changes

**`src/components/ScenarioEditorPanel.tsx`**:
- Add a locale toggle button (🇬🇧/🇫🇷) in the editor header, next to the back button.
- When FR is active, each `OverrideField` for translatable fields (title, teaser, content) shows a second input below with a 🇫🇷 prefix. Saving writes to `scenario_overrides` with field `fr:title` etc.
- The AI ✨ button next to FR fields calls `generate-translation` edge function.
- Export includes the `fr` sub-object in the generated `scenarios.ts`.

**`src/components/FeatEditorPanel.tsx`**:
- Same locale toggle in the expanded feat header.
- Translatable fields: title, description, prerequisites, special.
- Non-translatable fields (categories, specialities, subfeats, blocking, unlocks_categories) stay locale-independent.
- Export includes `fr` sub-object in `feats-data.json`.

### Runtime (Player-Facing)

**`src/data/scenarios.ts`** — `getAllScenarios()` and `getScenarioById()` gain optional `locale` param. When `fr`, return `scenario.fr?.field ?? scenario.field`.

**`src/data/feats.ts`** — Same pattern for `getAllFeats()`, `getFeatById()`, `getFeatMeta()`.

**Consuming components** (`Dashboard`, `PlayGame`, `Home`, `CharacterFeatPicker`, `CharacterCreationWizard`, `WikiSectionTree`, etc.) — pass current i18n locale to data accessors.

### Export Changes

**`ScenarioEditorPanel.handleDownloadAndClear`** — Include `fr: { title, teaser, content }` in exported scenario objects when FR overrides exist.

**`FeatEditorPanel.handleDownloadAndClear`** — Include `fr: { title, description, prerequisites, special }` in exported feat meta when FR overrides exist.

### i18n Keys
Add to `en.ts`/`fr.ts`:
- `adminEditor.langToggle` — "Content language"
- `adminEditor.frTranslation` — "French translation"
- `adminEditor.translationSaved` — "Translation saved"

### Files to modify
1. `src/data/scenarios.ts` — add `fr` to interface + locale-aware accessors
2. `src/data/feats.ts` — add `fr` to interface + locale-aware accessors
3. `src/lib/scenarioOverrides.ts` — handle `fr:*` prefixed fields
4. `src/lib/featOverrides.ts` — handle `fr:*` prefixed fields
5. `src/components/ScenarioEditorPanel.tsx` — locale toggle + FR inputs + export
6. `src/components/FeatEditorPanel.tsx` — locale toggle + FR inputs + export
7. `src/i18n/en.ts` + `src/i18n/fr.ts` — new keys
8. Consumer components — pass locale to data accessors (~6-8 files)

