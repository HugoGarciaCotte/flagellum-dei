

## Plan: Add reference image input to AI Generate mode

### Changes

#### 1. Edge function (`supabase/functions/generate-scenario-background/index.ts`)

Accept an optional `referenceImageUrl` field in the request body. When provided, pass it to the image generation step (Step 2) as a multimodal content array instead of a plain text prompt:

```typescript
// When referenceImageUrl is provided:
messages: [{
  role: "user",
  content: [
    { type: "text", text: imagePrompt },
    { type: "image_url", image_url: { url: referenceImageUrl } }
  ]
}]
// When not provided (current behavior):
messages: [{ role: "user", content: imagePrompt }]
```

Also prepend "Transform this image in the style of:" or similar to the prompt when a reference image is given, so the model treats it as an edit/variation rather than ignoring it.

#### 2. ScenarioEditorPanel — AI mode UI

Add an optional file picker for a reference image in the AI Generate section:
- A small "📎 Reference image" file input (or upload button) below the prompt input
- When a file is selected, upload it to `app-assets/scenario-backgrounds/ref-{timestamp}.png` first to get a public URL, then pass that URL as `referenceImageUrl` to the edge function
- Show a small thumbnail preview of the selected reference image
- New state: `bgRefFile: File | null`, `bgRefUrl: string`

#### 3. i18n keys

- `adminScenarios.bgRefImage`: "Reference image (optional)"

### Files changed
- `supabase/functions/generate-scenario-background/index.ts` — accept `referenceImageUrl`, pass to image gen
- `src/components/ScenarioEditorPanel.tsx` — add ref image picker in AI mode
- `src/i18n/en.ts` — one new key

