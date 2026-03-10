

## Regenerate PWA Icons from Updated Logo SVG

The `src/assets/logo.svg` and `public/favicon.svg` are already updated with the user's realigned path-based SVG. The remaining work is regenerating the PWA PNG icons.

### Changes

1. **Rewrite `supabase/functions/generate-pwa-icon/index.ts`**
   - Remove the AI-based image generation approach
   - Embed the actual logo SVG content directly in the function
   - Use `resvg-wasm` (available via `https://esm.sh/@aspect-dev/resvg-wasm`) to rasterize the SVG to PNG at 512px
   - Upload the 512px PNG to `app-assets/pwa-icon-512.png` and the same image to `app-assets/pwa-icon-192.png` (browsers handle scaling)
   - Keep existing CORS headers and storage upload logic

2. **Invoke the function** after deployment to regenerate the icons in storage

All other references (`index.html`, `Logo.tsx`, `vite.config.ts` manifest) are already correct and point to the right files.

