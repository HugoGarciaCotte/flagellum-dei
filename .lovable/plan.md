

## Auto-Start Playlist on First Section Click

### Problem
When the user clicks a section's play button for the first time, the playlist URL is passed to `SpotifyPlayer` but the playback-start effect (line 202) only fires when `effectivePlaylistUrl` changes AND the device is ready. The guard `currentPlaylistRef.current === uri` prevents replay if the URI was already set. The real issue is that the effect runs correctly — but only if Spotify is already initialized. If the device just became ready, it should auto-start.

Looking at the code: the effect at line 202 depends on `[deviceId, accessToken, effectivePlaylistUrl]`. When a section is first clicked, `effectivePlaylistUrl` changes → the effect runs → playback starts. This should already work.

**However**, if the playlist URL was already set (e.g. scenario-level playlist metadata) before any section is clicked, `currentPlaylistRef` may already equal the URI, so the guard skips it. The section click via `activateSection` updates `current_section` which resolves the playlist — but if the resolved playlist is the same as the scenario default, nothing happens.

### Fix

Remove the early-return guard when nothing is currently playing. The guard should only prevent re-triggering when already playing the same playlist:

**`src/components/SpotifyPlayer.tsx`** (line 206):

```typescript
// Before:
if (currentPlaylistRef.current === uri) return;

// After:
if (currentPlaylistRef.current === uri && isPlaying) return;
```

This way, if the playlist URI matches but nothing is playing yet (first section click), it will start playback. Once playing, clicking the same section again won't restart.

One file, 1 line changed.

