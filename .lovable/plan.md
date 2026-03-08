

## Generate PWA Icon via AI Image Generation

Create a one-shot edge function that generates a themed icon for "Prima TRPG Helper" using the Lovable AI image generation model, stores both 512px and 192px versions in file storage, then update the PWA manifest and index.html to reference the stored images.

### Steps

1. **Create a storage bucket** `app-assets` (public) for storing the generated icons

2. **Create edge function `generate-pwa-icon/index.ts`**:
   - Call `google/gemini-2.5-flash-image` via `https://ai.gateway.lovable.dev/v1/chat/completions` with a prompt like: *"Generate a square app icon for a tabletop RPG helper app called 'Prima TRPG'. Use a fantasy shield or sword motif with warm parchment/gold tones on a dark background. Simple, bold, recognizable at small sizes. No text."*
   - Decode the base64 result
   - Upload to storage bucket as `pwa-icon-512.png`
   - Also resize conceptually by requesting a second generation at the same size (PWA handles scaling) or just use the same image for both sizes
   - Return the public URL

3. **Update `vite.config.ts`** PWA manifest icons to point to the Supabase storage public URLs instead of local `/pwa-*.png` files

4. **Update `index.html`** — no favicon link currently exists, but the manifest handles it

5. **Invoke the function once** to generate and store the icon

### Prompt for the icon
A fantasy-themed square app icon: a golden shield with crossed swords on a dark (#141318) background, warm parchment tones, clean and bold for mobile home screens, no text.

