

## Polish Landing Page Design and Generate AI Images

### Overview
Create an edge function to generate atmospheric images via AI, store them in the existing `app-assets` bucket, then update the landing page to display them and refine the overall design.

### Image Generation

**New edge function: `supabase/functions/generate-landing-images/index.ts`**
- Public endpoint (no JWT) that generates 5 images using `google/gemini-3-pro-image-preview` (higher quality):
  1. **Hero**: Dark medieval street scene — plague-era town, inquisitors with torches, fog, night, gothic architecture
  2. **Scenario 1**: Burned medieval village at dusk, chapel ruins
  3. **Scenario 2**: Isolated monastery in winter snow, eerie silence
  4. **Scenario 3**: Pilgrims walking through fog toward a cathedral
  5. **Scriptorium**: Dim medieval scriptorium with manuscripts and candles
- Each image is uploaded to `app-assets/landing/` in the storage bucket
- Idempotent: skips images that already exist
- Returns the list of generated image URLs

**`supabase/config.toml`** — Register the new function with `verify_jwt = false`

### Landing Page Updates (`src/pages/Home.tsx`)

**Image integration:**
- Load images from `app-assets/landing/` public URLs
- Hero section right side: replace the gradient placeholder with the hero illustration
- Scenario cards: show generated scene images instead of the gradient placeholder
- Section 6 (Depth): use scriptorium image as a subtle background

**Design refinements:**
- Hero: add a subtle vignette overlay on the image, refine the gradient layering
- Scenario cards: taller image area with overlay text, aged-file aesthetic with slight sepia border treatment
- Step cards: add subtle gold top-border accent and refined numbering
- Feature columns: add subtle icon accents (Flame, Cross, ScrollText) above each title
- Section transitions: use ornamental dividers between more sections
- Footer: slightly more detailed with a thin gold rule
- Overall: tighten letter-spacing on kickers, increase section title sizes slightly

### CSS additions (`src/index.css`)
- `.vignette-overlay` utility for image darkening at edges
- `.aged-border` utility for scenario card sepia-toned borders

### Files to edit
- `supabase/functions/generate-landing-images/index.ts` (new)
- `supabase/config.toml`
- `src/pages/Home.tsx`
- `src/index.css`

