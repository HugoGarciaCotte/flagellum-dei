

## Use "🜹" as app icon everywhere

### Changes

**1. Create `public/favicon.svg`**
An SVG with the alchemical symbol "🜹" in gold (#C6930A) on a solid black (#141318) background, vertically and horizontally centered using `dominant-baseline` and `text-anchor` attributes. No top padding.

**2. Update `index.html`**
- Replace the existing `<link rel="icon" href="/favicon.ico">` with a reference to the new SVG favicon
- Add an Apple touch icon reference

**3. Update `vite.config.ts` PWA manifest**
- Change the PWA icon entries to point to the new SVG (or keep the Supabase-hosted PNGs as fallback)

**4. Update `supabase/functions/generate-pwa-icon/index.ts`**
- Change the AI prompt to specifically request the "🜹" alchemical antimony symbol in gold on black background, perfectly centered, no top margin. This regenerates proper 192 and 512 PNG icons for PWA install.

**5. Create a canvas-based PWA icon generator alternatively**
Since relying on AI for exact symbol rendering is unreliable, create a simpler edge function that:
- Uses a canvas (via Deno's `skia_canvas` or returns an SVG-converted-to-PNG) with the exact Unicode character rendered in gold on black
- Uploads to storage as before

Given canvas limitations in Deno edge functions, the most reliable approach is:
- Use the SVG as the primary favicon
- Update the AI prompt for PWA PNGs to be as specific as possible about the symbol
- Invoke the edge function to regenerate the icons

### Files to edit
- `public/favicon.svg` (new)
- `index.html`
- `vite.config.ts` (manifest icons + includeAssets)
- `supabase/functions/generate-pwa-icon/index.ts` (updated prompt)

