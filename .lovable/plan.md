

## Rename Scenario `description` to `teaser` + Add Copy-Paste in Scenario List

### Summary
Rename the `description` field to `teaser` throughout the codebase. In the admin scenario list, show each scenario's teaser text with a copy button. Add a label "Teaser (send to the players before the game)" above the teaser column/section.

### Changes

**1. `src/data/scenarios.ts`** — Rename `description` → `teaser` in the `Scenario` interface and all hardcoded scenario objects.

**2. `src/lib/scenarioOverrides.ts`** — Update `applyScenarioOverrides` to handle `teaser` instead of `description`.

**3. `src/components/ScenarioEditorPanel.tsx`**:
- Update `SCENARIO_FIELDS` to use `"teaser"` instead of `"description"`.
- Update the editor overlay Row 2 label and field references.
- Update the download/export code to output `teaser`.
- In the scenario list (lines 416-434), expand each row to show the teaser text with a copy-to-clipboard button (📋 icon). Add a column/sub-label: "Teaser (send to the players before the game)".
- Pass `scenarioTeaser` instead of `scenarioDescription` to `ContentEditor`.

**4. `src/components/ManageScenarios.tsx`** — Rename the table column header from "Description" to "Teaser" and reference `s.teaser`.

**5. `src/pages/Dashboard.tsx`** — Update `scenario.description` → `scenario.teaser`.

**6. `src/pages/Home.tsx`** — Update `s.description` → `s.teaser` in the scenario showcase.

**7. `src/i18n/en.ts` & `src/i18n/fr.ts`** — Add translation keys:
- `adminScenarios.fieldTeaser` → "Teaser"
- `adminScenarios.teaserHint` → "Teaser (send to the players before the game)"
- `adminScenarios.copied` → "Copied!"
- Remove/rename `adminScenarios.fieldDescription` and `adminLegacy.tableDescription`.

**8. `src/components/WikiSectionTree.tsx`** — If it references `meta.description` from scenarios, update accordingly.

### Scenario List UI (ScenarioEditorPanel)
Each scenario row will show:
```
▶ Chapter 1 - Societas Templois    [Modified] [Lvl 1]
  "Investigators at a remote Austrian abbey..."  [📋]
```
The teaser text is shown in muted italic below the title, with a small copy button that copies the teaser to clipboard and shows a "Copied!" toast.

Above the list, a subtle label: *"Teaser (send to the players before the game)"*

~8 files, moderate rename + small UI addition.

