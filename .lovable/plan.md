

## Switch SpotifyPlayer from IFrame Embed API to Web Playback SDK

### Current State
- `SpotifyPlayer.tsx` uses the Spotify **IFrame Embed API** (`open.spotify.com/embed/iframe-api/v1`), which causes DOM conflicts with rrweb
- DB infrastructure exists: `profiles` table has `spotify_access_token`, `spotify_refresh_token`, `spotify_token_expires_at` columns
- Secrets exist: `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are configured
- `vite.config.ts` already excludes `/spotify-callback` from the service worker
- Translation keys for connect/disconnect/premium are already defined
- The `spotify-token-exchange` edge function directory exists but is empty

### Plan

#### 1. Create the `spotify-token-exchange` edge function
Handles two flows:
- **`grant_type: "authorization_code"`** — exchanges a PKCE auth code for access + refresh tokens, stores them in the user's `profiles` row
- **`grant_type: "refresh_token"`** — refreshes an expired access token using the stored refresh token, updates `profiles`

Uses `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` from secrets. Requires the user's Supabase JWT to identify which profile to update.

#### 2. Create a `useSpotifyAuth` hook (`src/hooks/useSpotifyAuth.ts`)
- Reads `spotify_access_token` and `spotify_token_expires_at` from the user's profile (via local store or direct query)
- Provides `connect()` — generates PKCE verifier/challenge, redirects to Spotify's `/authorize` endpoint with scopes `streaming user-read-email user-read-private`
- Provides `disconnect()` — clears tokens from profile
- Provides `getValidToken()` — returns current token or auto-refreshes via the edge function if expired
- On mount, checks if URL has a `?code=` param (callback) and exchanges it

#### 3. Add a `/spotify-callback` route in `App.tsx`
A lightweight component that:
- Extracts `code` and `state` from the URL
- Calls the `spotify-token-exchange` edge function with the code
- Redirects back to the game page (stored in `state` param)

#### 4. Rewrite `SpotifyPlayer.tsx` to use the Web Playback SDK
Replace the entire IFrame approach with:
- Load `https://sdk.scdn.co/spotify-player.js` script
- On `window.onSpotifyWebPlaybackSDKReady`, create a `Spotify.Player` instance with the access token from `useSpotifyAuth`
- Connect the player, handle `ready`, `not_ready`, `player_state_changed` events
- Use `player.resume()`, `player.pause()`, `player.togglePlay()` for controls
- To play a specific URI, call the Spotify Web API `PUT /me/player/play` with the device ID and the URI
- Show connect button if no token, play/pause controls if connected
- Show track name and artist from `player_state_changed` events
- Keep the pill/expanded panel UI pattern but with real playback controls

#### 5. Handle `playTrackUrl` and `playlistUrl` props
- When `playTrackUrl` changes (inline queue track button clicked), call `PUT /me/player/play` with that track URI on the active device
- When `playlistUrl` is set (section playlist), call `PUT /me/player/play` with the playlist context URI
- Track priority: `playTrackUrl` > `playlistUrl` (same as current)

### Files to Create/Edit
| File | Action |
|------|--------|
| `supabase/functions/spotify-token-exchange/index.ts` | Create — OAuth token exchange |
| `src/hooks/useSpotifyAuth.ts` | Create — PKCE auth flow + token management |
| `src/components/SpotifyCallback.tsx` | Create — callback page component |
| `src/components/SpotifyPlayer.tsx` | Rewrite — SDK-based player |
| `src/App.tsx` | Add `/spotify-callback` route |

### UI When Not Connected
The pill button shows "Connect Spotify" instead of the playlist name. Clicking it opens the Spotify OAuth flow. After connecting, the pill shows the current track/playlist name with play/pause controls.

### Spotify Premium Requirement
The Web Playback SDK requires Spotify Premium. If the player initialization fails with a premium error, display the `spotify.premiumRequired` translation message.

