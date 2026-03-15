

## Implement Spotify IFrame API for Autoplay

### Problem
The Spotify embed with `autoplay=1` doesn't reliably start playback due to browser policies, especially when the iframe is hidden.

### Changes — `src/components/SpotifyPlayer.tsx`

1. **Load the Spotify IFrame API script** on mount (`https://open.spotify.com/embed/iframe-api/v1`)
2. **Switch from raw `<iframe>` to API-managed embed** using `IFrameAPI.createController()` with a target `<div>` ref
3. **Call `controller.play()`** on ready callback to auto-start
4. **When `embedUrl` changes**, destroy old controller, create new one that auto-plays
5. **Fix hidden container** — use `absolute left-[-9999px]` instead of `h-0 w-0 overflow-hidden` so the browser treats the embed as "visible"
6. **Remove `loading="lazy"`** — interferes with immediate playback

### Approach
- Use `useRef` for API instance, controller, and container div
- `useEffect` to load script + set `window.onSpotifyIframeApiReady`
- `useEffect` watching `embedUrl` to create/recreate controller with `uri` option and call `.play()` on ready
- Keep expanded/collapsed UI logic as-is, just swap iframe rendering to use the API-managed div

No API keys or secrets needed — this is a public client-side library.

