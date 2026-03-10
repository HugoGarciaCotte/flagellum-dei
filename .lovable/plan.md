

## Fix iOS PWA Icon — Use `social-icon.png`

### Problem
The current `pwa-icon-192.png` and `pwa-icon-512.png` are showing a black "F" on iOS. The correct branding is in `public/social-icon.png`.

### Changes

1. **`index.html`** — Update apple-touch-icon to reference `social-icon.png`:
   ```html
   <link rel="apple-touch-icon" href="/social-icon.png">
   ```

2. **`vite.config.ts`** — Update the PWA manifest icons array to use `social-icon.png` for the 512×512 entries (keep `favicon.svg` for the SVG entry):
   ```ts
   icons: [
     { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
     { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
     { src: "/social-icon.png", sizes: "512x512", type: "image/png" },
     { src: "/social-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
   ],
   ```

   Also add `social-icon.png` to `includeAssets` for precaching.

> Note: iOS primarily uses the `apple-touch-icon` link, so updating that to `social-icon.png` is the key fix. After installing, you'll need to delete the old PWA and re-install to see the new icon.

