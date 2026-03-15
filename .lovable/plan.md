

## Add Idle Hint to Spotify Pill

When Spotify is connected but no playlist is playing yet (no `playlistUrl`), the pill should show an idle hint similar to the ambiance timer's `"timer.noSection"` pattern.

### Changes

**`src/components/SpotifyPlayer.tsx`** — Update `getPillStatus()` (line 269):

After the `loading` check and before the `isPlaying` check, add a condition: if Spotify is ready (`accessToken` exists, no error, not loading) but there's no playlist assigned (`!effectivePlaylistName` or no `playlistUrl`), return the idle hint text.

```typescript
if (!effectivePlaylistName && !isPlaying) return { text: t("spotify.noSection"), actionable: false };
```

**`src/i18n/en.ts`** — Add key:
```typescript
"spotify.noSection": "Press ▶ on a section to start music",
```

**`src/i18n/fr.ts`** — Add key:
```typescript
"spotify.noSection": "Appuyez sur ▶ pour lancer la musique",
```

Three files, ~3 lines added.

