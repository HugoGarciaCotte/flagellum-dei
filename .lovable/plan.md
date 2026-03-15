

## Replace Spotify Web Playback SDK with Embed (iframe) API

### Concept

Strip out all OAuth/PKCE/token/SDK complexity. Replace with Spotify's [Embed API](https://developer.spotify.com/documentation/embeds), which renders an iframe for any playlist or track URL — no auth, no API keys, no secrets needed. The GM clicks the pill, it expands to show the Spotify embed iframe for the current playlist or track.

### What gets removed

- **`src/lib/spotifyAuth.ts`** — delete entirely
- **`src/pages/SpotifyCallback.tsx`** — delete entirely  
- **`supabase/functions/spotify-token-exchange/index.ts`** — delete entirely
- All token/auth state in `SpotifyPlayer.tsx` (accessToken, refreshToken, SDK init, PKCE flow, sessionStorage tokens)
- All references to `spotify_access_token`, `spotify_refresh_token`, `spotify_token_expires_at` in profile queries
- The Spotify name resolution logic in `ScenarioEditorPanel.tsx` (since no token available — names are typed manually in the tag)
- Route for `/spotify-callback` in `App.tsx`

### What changes

**`src/components/SpotifyPlayer.tsx`** — complete rewrite, much simpler:
- Props: `playlistUrl?: string`, `playlistName?: string`, `playTrackUrl?: string`
- State: `expanded` (boolean) only
- When collapsed: pill with Music icon + playlist name (same as now)
- When expanded: renders a Spotify embed iframe via `https://open.spotify.com/embed/playlist/{id}` or `https://open.spotify.com/embed/track/{id}` 
- If `playTrackUrl` is set, the iframe shows that track; otherwise shows the playlist
- The embed has built-in play/pause controls — no custom controls needed
- "Open in Spotify" link remains
- No auth required at all — works for any user, guest or logged in
- Iframe size: ~300×80 for compact mode

**`src/pages/HostGame.tsx`** — minor cleanup:
- Remove any token-related logic
- Keep playlist/track resolution (already works)
- Keep `handlePlayTrack` callback and `playTrackUrl` state

**`src/components/WikiSectionTree.tsx`** — no changes needed (queue track buttons already work via `onPlayTrack` callback)

**`src/components/ScenarioEditorPanel.tsx`** — remove Spotify API name resolution in the insert tag handlers (just prompt for URL and name, no auto-resolve)

**`src/App.tsx`** — remove `/spotify-callback` route

### Spotify Embed URL format

```
Playlist: https://open.spotify.com/embed/playlist/4GZgLYVRC7JG84Ftrmqu62?utm_source=generator&theme=0
Track:    https://open.spotify.com/embed/track/abc123?utm_source=generator&theme=0
```

Derived by inserting `/embed` after `open.spotify.com` in the existing URL. The `theme=0` parameter gives a dark theme.

### iframe markup

```html
<iframe 
  src="https://open.spotify.com/embed/playlist/4GZgLYVRC7JG84Ftrmqu62?utm_source=generator&theme=0"
  width="100%" 
  height="152" 
  frameBorder="0" 
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
  loading="lazy"
/>
```

### Files to edit
1. **`src/components/SpotifyPlayer.tsx`** — rewrite (iframe-based, no auth)
2. **`src/pages/HostGame.tsx`** — minor cleanup  
3. **`src/components/ScenarioEditorPanel.tsx`** — remove token-based name resolution
4. **`src/App.tsx`** — remove spotify-callback route
5. **Delete**: `src/lib/spotifyAuth.ts`, `src/pages/SpotifyCallback.tsx`, `supabase/functions/spotify-token-exchange/index.ts`

