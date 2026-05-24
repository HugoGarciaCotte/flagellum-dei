## Why it goes stale

Current setup in `vite.config.ts`:
- `registerType: "autoUpdate"` + `skipWaiting` + `clientsClaim` — good.
- But Workbox's default precache serves `index.html` **cache-first** from the precache manifest. So on reload, you get the old HTML (which references the old hashed JS bundles) instantly. The new service worker downloads in the background, and you only see the new version on the **next** reload after that.
- There's also no `runtimeCaching` rule for HTML navigations to override this.

Net effect: every deploy needs two reloads to take effect, and depending on timing you can stay on the old build indefinitely if you close the tab between the two.

## Fix (one config change, no offline regression)

Add an explicit `NetworkFirst` runtime caching rule for navigation requests, with a short network timeout. This means:

- **Online**: browser fetches fresh `index.html` (which links the new hashed JS chunks). New code shows on the first reload.
- **Offline / slow network**: after 3 s the SW falls back to the cached HTML, so the app still boots offline exactly like today.
- Hashed JS/CSS chunks stay precached — instant load, and a stale HTML reference is impossible because the HTML itself is now fresh.

### Change in `vite.config.ts`

Inside the existing `workbox.runtimeCaching` array, add:

```ts
{
  urlPattern: ({ request }) => request.mode === "navigate",
  handler: "NetworkFirst",
  options: {
    cacheName: "html-shell",
    networkTimeoutSeconds: 3,
    expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
  },
},
```

Keep everything else as-is (`skipWaiting`, `clientsClaim`, precache, all the existing API/image/font rules). No manifest changes, no new dependencies.

### Optional, only if you want belt-and-braces

Add a tiny "update available" toast that calls `updateSW()` from `virtual:pwa-register` when a new SW is waiting. This is overkill for your case since `NetworkFirst` HTML already solves the "one stale reload" problem — only worth doing if you ever want to ship a "Refresh to update" prompt to long-lived tabs. I'd skip it unless you ask for it.

## Verification

After the change ships once (the current stale SW has to update itself one last time):
1. Publish a small visible change.
2. Reload the deployed PWA online → new build visible on first reload.
3. Toggle DevTools → Network → Offline, reload → app still boots from cache.
4. Confirm in DevTools → Application → Cache Storage that `html-shell` contains your `/` document and precache still contains the hashed JS chunks.

## Caveat

The very next deploy after this change is the one that "unsticks" devices — they still need to pick up the new SW once. From that deploy onward, every future update lands on first online reload.
