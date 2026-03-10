

## Replace PWA icon with uploaded image

**What**: Replace the current generated PWA icons with the user's uploaded `social-icon.png` image.

**How**:

1. **Copy the uploaded image to `public/`** as `public/pwa-icon-512.png` — this makes it available as a static asset that gets precached by the service worker (per our `globPatterns` fix).

2. **Update `vite.config.ts` manifest icons** to point to the local files instead of remote Supabase storage URLs:
   - `pwa-icon-512.png` → `"/pwa-icon-512.png"` (512×512)
   - `pwa-icon-192.png` → `"/pwa-icon-192.png"` (192×192, same file — browsers downscale fine)
   - Same for the maskable entry

3. **Update `index.html`** apple-touch-icon link to also use `/pwa-icon-512.png`.

4. **Also copy as `public/social-icon.png`** so the OG/social meta tags reference it locally too (it's already referenced in `index.html`).

This eliminates the dependency on the remote storage URL for PWA icons and ensures they're always available offline. The `generate-pwa-icon` edge function becomes unused but can stay for now.

