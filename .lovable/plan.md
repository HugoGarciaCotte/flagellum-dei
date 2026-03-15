

## Per-Section Playlist Tags (GM-only feature)

### Tag Format

Two metadata tags, using the existing `<!--@ key: value @-->` system:

```
<!--@ playlist: https://open.spotify.com/playlist/4GZgLYVRC7JG84Ftrmqu62 | Medieval Ambiance @-->
<!--@ queue_track: https://open.spotify.com/track/abc123 | Gregorian Chant @-->
```

Both URL and name are inside the same tag, separated by `|`. This keeps insertion simple and avoids needing two separate tags.

### Inheritance

- `playlist` — inherited downward through sections (like `background_image`)
- `queue_track` — NOT inherited, only applies to the section where it appears

Default playlist: current hardcoded `4GZgLYVRC7JG84Ftrmqu62` when no tag is present.

### Changes

**`src/lib/parseWikitext.ts`**
- Add `resolvePlaylist(section, ancestorPlaylist)` helper mirroring `resolveBackgroundImage`
- Add types: `PlaylistInfo { url: string; name: string }`, `QueueTrackInfo { url: string; name: string }`
- Add `collectQueueTracks(section)` to extract `queue_track` entries

**`src/pages/HostGame.tsx`**
- Resolve effective playlist for active section (tree-walk like ambiance)
- Collect queue tracks for active section
- Pass `playlistUrl`, `playlistName`, `queueTracks` to `SpotifyPlayer`

**`src/pages/PlayGame.tsx`**
- Remove `SpotifyPlayer` — this is a GM-only feature

**`src/components/SpotifyPlayer.tsx`**
- Accept new props: `playlistUrl?: string`, `playlistName?: string`, `queueTracks?: string[]`
- Use `playlistUrl` instead of hardcoded `PLAYLIST_URI` (keep hardcoded as default fallback)
- When `playlistUrl` changes → switch playback context
- When `queueTracks` change → add to queue via Spotify API
- Always show "Open in Spotify" button in expanded panel linking to current playlist or last queued track URL, regardless of SDK connection
- Pill shows playlist name when available

**`src/components/WikiSectionTree.tsx`**
- In `SectionNode`, if section has `playlist` metadata, show playlist name + small external link icon next to section title (GM view only — but WikiSectionTree is already GM-only since it's in HostGame)

**`src/components/ScenarioEditorPanel.tsx`**
- Add two new dropdown items in "Insert Tag":
  - "Playlist" → prompts for URL, inserts `<!--@ playlist: URL | Name @-->` (if Spotify API available via token, resolve playlist name automatically; otherwise use URL as name)
  - "Queue Track" → prompts for URL, inserts `<!--@ queue_track: URL | Name @-->` (same name resolution logic)
- Name resolution: use Spotify Web API (`GET /v1/playlists/{id}` or `GET /v1/tracks/{id}`) to fetch the name from the URL when inserting. Fall back to the URL if no token is available.

**`src/i18n/en.ts` + `src/i18n/fr.ts`**
- Add keys: `spotify.openInSpotify`, `spotify.playlist`, `adminScenarios.insertTagPlaylist`, `adminScenarios.insertTagQueueTrack`

### Spotify Name Resolution on Insert

When the GM inserts a playlist or track tag via the editor toolbar:
1. Extract the Spotify ID from the pasted URL
2. If user has a Spotify access token in sessionStorage, call the Spotify Web API to fetch the name
3. Insert the tag with the resolved name: `<!--@ playlist: URL | Resolved Name @-->`
4. If no token or API fails, use a generic placeholder the GM can edit manually

