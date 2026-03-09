

## Add Portrait Generation to Wizard Final Step

The portrait section in step 5 currently only has an Upload button. Need to add a Generate button next to it, plus move the description hint closer to that button.

### Changes in `CharacterCreationWizard.tsx`

1. **Add `generating` state** (boolean) near the other state declarations.

2. **Add `handleGeneratePortrait` function** — but since the character doesn't exist yet at this point, we can't call `generate-character-portrait` (it requires a `characterId`). Instead, we need to call the AI gateway directly from the client side to generate the image and store it as a blob/data URL in `portraitUrl` state.

Actually, wait — the edge function fetches the character from DB. The character isn't created yet during the wizard. So we need to generate the portrait **client-side** by:
- Building a prompt from the chosen feats + description
- Calling the AI gateway via an edge function that doesn't need a characterId

**Simpler approach**: Create the portrait inline using a new edge function `generate-portrait-from-description` that takes description + feat names and returns a base64 image. Or reuse the existing function's logic but without the DB lookup.

**Simplest approach**: Add a lightweight edge function that accepts `{ description, featNames }`, generates a prompt, generates an image, and returns the base64 data URL. Then in the wizard, set `portraitUrl` to that data URL. When `createCharacter` runs, it uploads the portrait to storage.

### New edge function: `generate-portrait-preview`
- Accepts `{ description, featNames }` (no auth required for preview, but we'll keep auth)
- Step 1: Generate prompt via Gemini (same as existing function)
- Step 2: Generate image via Gemini image model
- Returns `{ image_data_url }` (base64)

### Changes in `CharacterCreationWizard.tsx`

1. Add `generatingPortrait` state
2. Add `handleGeneratePortrait` async function:
   - Collect feat names from selected feats
   - Call `generate-portrait-preview` edge function with description + feat names
   - Set `portraitUrl` to returned data URL
3. **Move the description hint** from below the description textarea to next to the Generate button in the portrait section
4. Add Generate button with Sparkles icon next to Upload button
5. Show loading state on avatar while generating

### Portrait section will look like:
```
[Avatar]
[Upload] [Generate Portrait ✨]
"Portrait is generated from your description — add details like gender, age..."
```

