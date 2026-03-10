

## Apply Updated Logo SVG & Regenerate PWA Icons

The `src/assets/logo.svg` and `public/favicon.svg` were already updated in my previous message with the user's realigned SVG. Both files are identical and current.

### What needs to happen

1. **Regenerate PWA PNG icons** — The existing `generate-pwa-icon` edge function uses AI to generate icons from a text prompt, which won't match the actual logo. Instead, we should update the function to convert the actual SVG file into PNG format, or better yet, replace the approach entirely:

   **New approach**: Rewrite the `generate-pwa-icon` edge function to:
   - Accept the SVG content as input (or have it hardcoded)
   - Use an SVG-to-PNG conversion (via `resvg-wasm` or a canvas-based approach in Deno)
   - Upload the resulting 192px and 512px PNGs to storage, overwriting the old AI-generated ones

   Since Deno edge functions have limited image processing, the simplest reliable approach is to:
   - Embed the SVG as a data URI and upload it directly, OR
   - Use `resvg` WASM for server-side SVG→PNG rasterization

2. **Verify all references** — Already confirmed:
   - `index.html` → `/favicon.svg` ✓
   - `Logo.tsx` → `@/assets/logo.svg` ✓  
   - `vite.config.ts` PWA manifest → `favicon.svg` + storage URLs for PNGs ✓

### Implementation

- **Rewrite `supabase/functions/generate-pwa-icon/index.ts`** to embed the actual logo SVG and convert it to PNG using `resvg-wasm`, then upload 192px and 512px versions to the `app-assets` storage bucket
- After deploying, invoke the function once to regenerate the PNG icons in storage

