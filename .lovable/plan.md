

## Remove Default "Born to be epic" Playlist

Simple change: remove the hardcoded fallback playlist so the player only activates when a scenario section explicitly has a playlist. When a section has no playlist, the previous one keeps playing (current behavior, which is desired).

### Changes

**`src/components/SpotifyPlayer.tsx`**:
- Remove the `DEFAULT_PLAYLIST_URL` constant
- Remove the `effectivePlaylistUrl = playlistUrl || DEFAULT_PLAYLIST_URL` fallback — just use `playlistUrl` directly
- Remove `effectivePlaylistName` fallback to `t("spotify.defaultPlaylist")` — use `playlistName` directly
- When `playlistUrl` is undefined, skip the auto-start effect (don't start any playlist)
- Hide or dim the player pill when no playlist is active and nothing is playing (no track info to show)

No other files need changes. The existing behavior of continuing the previous playlist is already correct.

