

## Fixes & Improvements for Playlist/Music Tags

Three issues to address:

### 1. Editor: Simplify to 2 music options + rename Ambiance Track

**ScenarioEditorPanel.tsx**: Merge the current 3 music dropdown items into 2:
- **"Background Playlist"** (icon: `ListMusic`) — inserts `<!--@ playlist: URL | Name @-->`, resolves name via Spotify API
- **"One-Time Music"** (icon: `Music`) — inserts `<!--@ queue_track: URL | Name @-->`, resolves name via Spotify API

Rename **"Ambiance Track"** to something like **"Timer Events"** or **"Timed Narration"** with a `Timer` icon instead of `Music`, since it's about timed text events, not music.

**i18n**: Update `insertTagAmbiance` to "Timed Narration" / "Narration minutée", update `insertTagPlaylist` to "Background Playlist" / "Playlist de fond", update `insertTagQueueTrack` to "One-Time Music" / "Musique ponctuelle".

### 2. HostGame: Load scenario overrides before resolving

**HostGame.tsx**: Import and call `loadScenarioOverrides()` on mount (like PlayGame does), so DB-edited content with playlist/queue_track tags is actually used. Currently `getScenarioById` uses cached overrides which may not be loaded yet in HostGame.

### 3. Queue track buttons rendered inline where the tag appears

Currently, `queue_track` metadata tags are stripped from body content and buttons are rendered after all content. To place buttons where the tag physically sits:

**parseWikitext.ts**: Instead of fully skipping `queue_track` meta-only lines, inject an HTML marker (e.g. `<span class="wiki-queue-track" data-url="..." data-name="..."></span>`) into the body content. Keep extracting to `section.metadata` as well for backwards compat.

**WikiSectionTree.tsx**: After rendering `dangerouslySetInnerHTML`, use a `useEffect` to find `.wiki-queue-track` spans and replace them with React-managed play buttons (or simply render them as styled elements via the HTML). Simpler approach: render the marker as a styled button directly in the HTML (since we already use `dangerouslySetInnerHTML`), using an `onclick` data attribute pattern or event delegation.

Most practical approach: render the queue track as a clickable HTML element in the converted HTML, then use event delegation (like the existing feat-link hover) to handle clicks:
- In `parseWikitext.ts`, when a meta-only line has `queue_track`, inject `<button class="wiki-queue-track" data-url="URL" data-name="NAME">▶ NAME</button>` into the HTML body instead of skipping
- In `WikiSectionTree.tsx`, add a click handler via event delegation on `.wiki-queue-track` elements, calling `onPlayTrack`
- Style these buttons with CSS in `index.css`
- Remove the separate queue track button rendering block at the bottom of content segments

### Files to edit
- `src/lib/parseWikitext.ts` — inject queue_track as inline HTML markers
- `src/components/WikiSectionTree.tsx` — event delegation for inline play buttons, remove bottom block
- `src/components/ScenarioEditorPanel.tsx` — 2 music options, rename ambiance, change icon
- `src/pages/HostGame.tsx` — load scenario overrides on mount
- `src/i18n/en.ts` + `src/i18n/fr.ts` — updated labels
- `src/index.css` — styles for `.wiki-queue-track` inline buttons

