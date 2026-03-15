

## Queue Tracks as Inline Play Buttons

Currently, `queue_track` tags are parsed from metadata and passed as URL strings to `SpotifyPlayer`, which tries to auto-queue them. The user wants something different: each `queue_track` should render as a visible **play button** inline in the section content, showing the track name, that the GM can click to play that track on demand.

### Changes

**`src/components/WikiSectionTree.tsx`**
- In `SectionNode`, after rendering the section content, render the section's queue tracks (from `collectQueueTracks(section)`) as clickable buttons with a Play icon and the track name
- Each button opens the Spotify track URL (via `window.open`) or, if a callback is provided, triggers playback through the SDK
- Add a new prop `onPlayTrack?: (url: string) => void` to `WikiSectionTreeProps` and thread it down to `SectionNode`
- Style: small pill-like buttons with Music/Play icon + track name, similar to how playlists are shown

**`src/pages/HostGame.tsx`**
- Remove the `activeQueueTracks` logic that collects queue tracks and passes them to `SpotifyPlayer`
- Remove `queueTracks` prop from `SpotifyPlayer`
- Add an `onPlayTrack` callback that either:
  1. If Spotify SDK is connected: calls the Spotify API to play that specific track
  2. Falls back to `window.open(url)` to open in Spotify app/web
- Pass `onPlayTrack` to `WikiSectionTree`

**`src/components/SpotifyPlayer.tsx`**
- Remove `queueTracks` prop and all auto-queue logic
- Expose a way for the parent to trigger playback of a single track (either via a ref/callback or by accepting a `playTrackUrl` prop that plays on change)
- Simpler: add a `playTrackUrl?: string` state-driven prop — when it changes, play that track via the SDK

**`src/lib/parseWikitext.ts`**
- No changes needed — `collectQueueTracks` already works correctly

### UI for queue track buttons

Inside each section's content area, below the text, render something like:

```
[▶ Gregorian Chant]  [▶ Victory Fanfare]
```

Small rounded buttons with Play icon + track name, themed to match the section (primary-foreground when active, muted otherwise).

