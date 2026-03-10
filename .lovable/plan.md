

## Fix: Missing assets in PWA offline mode

**Problem**: VitePWA's default workbox `globPatterns` only precaches `**/*.{js,css,html}` from the build output. Imported assets like `logo.svg` (used as the signup tab icon) get compiled to hashed files like `/assets/logo-abc123.svg` but are **not precached** by the service worker. They only load if the runtime image cache has seen them before. On a fresh PWA install going offline, these assets show as broken images.

**Fix**: Add SVG (and other image formats) to workbox's `globPatterns` in `vite.config.ts` so all build assets are precached:

```ts
// vite.config.ts — inside VitePWA config
workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff,woff2}'],
  // ... existing runtimeCaching stays
}
```

One line addition. This ensures `logo.svg` and any other imported image/font assets are precached on service worker install and available offline immediately.

