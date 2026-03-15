

## Fix Track Play Buttons & Improve Their UI

### Two issues to address:

**1. Track play button not working**

The click delegation in `WikiSectionTree.tsx` (line 149-162) looks correct — it finds `.wiki-queue-track` via `.closest()` and calls `onPlayTrack(url)`. The SpotifyPlayer effect (line 227-257) queues the track then skips to it.

Likely cause: the `urlToUri()` conversion in SpotifyPlayer may not handle track URLs correctly, or the Spotify Queue API may be failing silently. The code only logs errors to console. We should add a toast notification on failure and verify the URL→URI conversion handles track URLs (e.g. `https://open.spotify.com/track/abc123`).

Additionally, the effect guard at line 229 (`if (!playTrackUrl) return`) combined with the null→setTimeout→value toggle pattern in HostGame could have a race condition. We should add user-visible feedback (brief visual flash on the button or a toast) to confirm the click is registered.

**2. Make buttons more visually obvious**

Currently the button HTML in `parseWikitext.ts` (line 257) renders: `<button class="wiki-queue-track" data-url="...">🎵 name</button>`

Since this is rendered via `dangerouslySetInnerHTML`, we can't use React components — we need inline SVG icons.

### Changes

**`src/lib/parseWikitext.ts`** (line 257):
- Replace the `🎵` emoji with inline SVG icons for a play triangle and a music note at the end
- Template: `<button class="wiki-queue-track" data-url="${url}"><svg ...play icon.../> ${name} <svg ...music icon.../></button>`

**`src/index.css`** (lines 123-142):
- Adjust `.wiki-queue-track` styles to be slightly larger/bolder so buttons are more prominent
- Add SVG icon sizing rules (e.g. `.wiki-queue-track svg { width: 14px; height: 14px; }`)

**`src/components/SpotifyPlayer.tsx`** (lines 227-257):
- Add error feedback: show a toast when the queue API call fails
- Add a console.log before the queue call to help debug

**`src/components/WikiSectionTree.tsx`** (line 149-162):
- Add a console.log in `handleContentClick` to confirm clicks are registering and the URL is correct

4 files, minor changes each.

