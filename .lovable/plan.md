

## Replace favicon and PWA icons with the 🜹 SVG

The project already has `public/favicon.svg` with the gold 🜹 on black. The issues: `index.html` has no favicon link, and the PWA manifest still points to Supabase-hosted PNGs. The old `pwa-192x192.png` and `pwa-512x512.png` in `public/` are stale.

### Changes

**1. `index.html`** — Add favicon and apple-touch-icon links:
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/favicon.svg">
```

**2. `vite.config.ts`** — Update PWA manifest icons to use the SVG as a fallback alongside the Supabase-hosted PNGs. Add `favicon.svg` as an apple-touch-icon in the manifest:
```ts
icons: [
  { src: "favicon.svg", sizes: "any", type: "image/svg+xml" },
  { src: "https://bcisbkompyqtfrtzccit.supabase.co/storage/v1/object/public/app-assets/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "https://bcisbkompyqtfrtzccit.supabase.co/storage/v1/object/public/app-assets/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
  { src: "https://bcisbkompyqtfrtzccit.supabase.co/storage/v1/object/public/app-assets/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
],
```

**3. Regenerate PWA PNGs** — Invoke the `generate-pwa-icon` edge function (already updated with the correct prompt) to upload fresh 192 and 512 PNGs to storage so the PWA install icons match.

**4. Delete stale files** — Remove `public/pwa-192x192.png`, `public/pwa-512x512.png`, and `public/favicon.ico` since they're no longer referenced.

### Files to edit
- `index.html`
- `vite.config.ts`
- Delete: `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/favicon.ico`

