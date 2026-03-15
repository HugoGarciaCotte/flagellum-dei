

## Add to Queue + Skip to Next

After queuing a track via the Spotify API, immediately call `player.nextTrack()` to skip to the newly queued song.

### Changes

**`src/components/SpotifyPlayer.tsx`** — in the `playTrackUrl` effect, after the successful `POST /queue` call, invoke `playerRef.current?.nextTrack()`:

```typescript
const res = await fetch(
  `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}&device_id=${deviceId}`,
  { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
);
if (res.ok) {
  playerRef.current?.nextTrack();
}
```

Also remove the unused `lastPlayTrackRef` ref and its guard.

One file, ~15 lines changed.

