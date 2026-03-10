

## Admin Panel: In-Memory Editors with File Download

No database needed. Editors load data from the bundled source files into React state, let you edit everything in-browser, and provide a **Download** button that exports the modified file so you can replace it in the codebase yourself.

### 1. Admin Panel Restructure (`src/pages/Admin.tsx`)

- Wrap all existing "Import from Wiki" cards + ManageScenarios + ImportFeatsCard + ManageRedirects into a single `Collapsible`, **collapsed by default**, labeled "Legacy Wiki Import (archived)"
- Add two navigation cards: **Scenario Manager** and **Feat Editor**

### 2. Scenario Manager (`/admin/scenarios`)

New page `src/pages/AdminScenarios.tsx`:
- Loads scenarios from `getAllScenarios()` into local state
- Each scenario is an expandable card showing editable fields: **title**, **description**, **level**, **content** (textarea)
- Add / delete scenarios
- **"Download scenarios.ts"** button at the top: serializes the current state into a valid TypeScript source file matching the exact format of `src/data/scenarios.ts` and triggers a browser file download

### 3. Feat Editor (`/admin/feats` — replaces current read-only viewer)

Upgrade `src/pages/AdminFeats.tsx` and replace `ManageFeats` with a new `FeatEditorPanel` component:
- Loads all feats from `getAllFeats()` into local state
- Search/filter bar (preserved from current)
- Each feat expandable with **all editable fields**:
  - Title, categories (comma-separated input)
  - Description, prerequisites, special, synonyms (text inputs)
  - Blocking feats (comma-separated)
  - Unlocks categories (comma-separated)
  - **Subfeats editor**: for each subfeat slot — kind (fixed/list/type), optional toggle, feat_title or pipe-separated options list
  - Content and raw_content (textareas)
- Add / delete feats
- **"Download feats-data.json"** button: serializes the full feats array + redirects into the exact JSON format of `src/data/feats-data.json` and triggers download

### 4. Routes (`src/App.tsx`)

- Add route `/admin/scenarios` → `AdminScenarios`

### 5. New Components

- `src/components/ScenarioEditorPanel.tsx` — the scenario list + editor UI
- `src/components/FeatEditorPanel.tsx` — the feat list + full editor UI
- `src/components/SubfeatSlotEditor.tsx` — inline editor for a single subfeat slot (kind select, options textarea, optional checkbox)

### Download Logic (shared utility)

```text
function downloadFile(filename, content, mimeType)
  → creates a Blob, temporary <a> link, triggers click, revokes URL
```

For scenarios: generates TypeScript source with the same structure as `scenarios.ts`.
For feats: generates JSON matching `feats-data.json` format (`{ feats: [...], redirects: [...] }`).

### Technical Notes

- All editing is in-memory React state — no database writes
- The `meta` field on feats is reconstructed from the parseable block fields (description, prerequisites, subfeats, blocking, unlocks_categories) and stored as a JSON object in the downloaded file
- The `raw_content` field includes the `<!--@ PARSEABLE FIELDS @-->` block, regenerated from the edited meta using the existing `generateParseableBlock` helper

