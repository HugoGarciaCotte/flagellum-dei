

## Plan: Download images + rewrite URLs on "Download & Clear DB"

### What changes

**`src/components/ScenarioEditorPanel.tsx`** — modify `handleDownloadAndClear`:

1. **Extract Supabase image URLs** from all scenario `content` fields using `extractImageUrls` from `parseWikitext.ts`
2. **Fetch each image** as a blob, derive filename from the URL path
3. **Build a URL map**: Supabase URL → local path like `/scenario-backgrounds/filename.png`
4. **Rewrite content**: replace all Supabase URLs in each scenario's content with the local paths before writing the `.ts` file
5. **Bundle into ZIP** using `jszip`: the `scenarios.ts` file + all images in a `scenario-backgrounds/` folder
6. **Generate a `README.txt`** inside the ZIP with a ready-to-paste Lovable prompt like:

```
Upload the images from the scenario-backgrounds/ folder into public/scenario-backgrounds/ 
and replace src/data/scenarios.ts with the scenarios.ts file from this ZIP.
```

7. Download the ZIP instead of just the `.ts` file

**`package.json`** — add `jszip` dependency

### Technical details

- `extractImageUrls` already exists and finds both `[[File:...]]` wiki URLs and raw `https://...png|jpg|webp` URLs
- Images are fetched via `fetch()` in parallel, failures are logged but non-blocking (URL left as-is if download fails)
- The local path strips the Supabase storage prefix, keeping just `scenario-backgrounds/{filename}`
- ZIP is created with `JSZip` and downloaded via `blob` + object URL

### Files changed
- `src/components/ScenarioEditorPanel.tsx` — refactor `handleDownloadAndClear`
- `package.json` — add `jszip`

