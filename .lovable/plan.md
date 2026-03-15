## Add Spotify Idle Hint with ▶ Emoji

### Changes

1. `**src/i18n/en.ts**` (line ~549) — Replace `spotify.defaultPlaylist` with `spotify.idleHint`:
  ```
   "spotify.idleHint": "Press ▶ on a section to start the bakcground music"
  ```
2. `**src/i18n/fr.ts**` (line ~109) — Same key in French:
  ```
   "spotify.idleHint": "Appuyez sur le ▶ d'une section pour lancer la musique d'ambiance"
  ```
3. `**src/components/SpotifyPlayer.tsx**` (line 271) — Update the fallback return in `getPillStatus()`:
  ```typescript
   return { text: effectivePlaylistName || t("spotify.idleHint"), actionable: !!effectivePlaylistName };
  ```

Three files, three one-line changes.