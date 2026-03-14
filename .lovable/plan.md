

## Plan: Enhanced background image inserter with Upload, Link, and AI Generate

### Current state
The background tag inserter is a simple URL input + "Insert Background" button. It inserts `<!--@ background_image: URL @-->` into the scenario content.

### Changes

#### 1. New edge function: `generate-scenario-background`

**File**: `supabase/functions/generate-scenario-background/index.ts`

- Accepts `{ scenarioTitle, scenarioDescription, prompt? }` (optional custom prompt)
- Step 1: Uses `google/gemini-3-flash-preview` to generate an image prompt from the scenario context (dark medieval, painterly style)
- Step 2: Uses `google/gemini-2.5-flash-image` with `modalities: ["image", "text"]` to generate the image
- Step 3: Decodes base64, uploads to `app-assets` bucket under `scenario-backgrounds/{scenarioId}.png`
- Returns the public URL
- Auth: validates JWT via `getClaims()`, checks owner role

#### 2. Update `ScenarioEditorPanel.tsx` — replace the toolbar

Replace the current single-line URL toolbar with a compact 3-mode toolbar:

```text
┌──────────────────────────────────────────────┐
│ 🖼  [Link] [Upload] [Generate AI]            │
│                                              │
│  Mode=Link:     [ URL input ] [Insert]       │
│  Mode=Upload:   [ file picker ] (auto-insert)│
│  Mode=AI:       [ prompt input ] [Generate]  │
└──────────────────────────────────────────────┘
```

- **Link mode** (default): Same as current — paste a URL, click Insert
- **Upload mode**: File input accepting images. On select:
  1. Upload to `app-assets` bucket under `scenario-backgrounds/{scenarioId}/{timestamp}.{ext}`
  2. Get public URL
  3. Auto-insert the background tag with that URL
- **AI Generate mode**: Text input for an optional prompt (e.g. "A dark forest at night"). Click "Generate":
  1. Call `generate-scenario-background` edge function
  2. Show loading spinner
  3. On success, auto-insert the background tag with the returned URL
  4. Show a small preview of the generated image

New state: `bgMode: "link" | "upload" | "ai"`, `generating: boolean`, `uploading: boolean`

#### 3. Storage RLS for `app-assets` bucket

The bucket already exists and is public. Add an RLS policy for owners to upload:
```sql
CREATE POLICY "Owner can upload app assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-assets' AND has_role(auth.uid(), 'owner'::app_role));
```

#### 4. i18n keys

Add to `en.ts`:
- `adminScenarios.bgModeLink`: "Link"
- `adminScenarios.bgModeUpload`: "Upload"  
- `adminScenarios.bgModeAi`: "Generate AI"
- `adminScenarios.bgPromptPlaceholder`: "Describe the scene (optional)"
- `adminScenarios.generating`: "Generating..."
- `adminScenarios.uploading`: "Uploading..."
- `adminScenarios.generateFailed`: "Generation failed"
- `adminScenarios.uploadFailed`: "Upload failed"

### Files changed
- **New**: `supabase/functions/generate-scenario-background/index.ts`
- **Migration**: Storage RLS policy for app-assets uploads
- **Edit**: `src/components/ScenarioEditorPanel.tsx` — 3-mode toolbar
- **Edit**: `src/i18n/en.ts` — new keys

