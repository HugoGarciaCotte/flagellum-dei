

## Spotify Web Playback SDK Integration

### Overview
Add a "Playlist" pill on the bottom-left of game pages (both Host and Play). When clicked, it expands into a Spotify player panel. Users connect their Spotify account once (PKCE OAuth), and tokens are persisted in their profile so they never have to reconnect.

For now: one hardcoded playlist (`spotify:playlist:4GZgLYVRC7JG84Ftrmqu62`). Offline = "Not available offline".

### Architecture

```text
┌─────────────────────────────────────┐
│  SpotifyPlayer (pill + expanded)    │
│  ├─ Not online → "Not available"    │
│  ├─ No token  → "Connect Spotify"   │
│  └─ Token OK  → Web Playback SDK    │
│       plays hardcoded playlist      │
└─────────┬───────────────────────────┘
          │ PKCE OAuth
          ▼
┌──────────────────────────────────┐
│ Edge fn: spotify-token-exchange  │
│  - Exchanges auth code → tokens  │
│  - Refreshes expired tokens      │
│  - Stores refresh_token in DB    │
└──────────────────────────────────┘
```

### Database Changes

**Migration**: Add Spotify token columns to `profiles` table:
```sql
ALTER TABLE public.profiles
  ADD COLUMN spotify_refresh_token text,
  ADD COLUMN spotify_access_token text,
  ADD COLUMN spotify_token_expires_at timestamptz;
```

No new RLS policies needed — existing profile policies already let users read/update their own profile.

### Secrets Needed
- **SPOTIFY_CLIENT_ID**: Public key from a Spotify Developer App (safe to embed in frontend too, but cleaner in edge function)
- **SPOTIFY_CLIENT_SECRET**: Required by the token exchange endpoint (server-side only, stored as edge function secret)

The user will need to create a Spotify Developer App at https://developer.spotify.com/dashboard and set the redirect URI to `{origin}/spotify-callback`.

### New Files

**1. `supabase/functions/spotify-token-exchange/index.ts`**
Edge function that:
- Accepts `{ code, redirect_uri }` or `{ refresh_token }`
- Exchanges code for tokens (or refreshes) via Spotify's `/api/token` endpoint
- Stores `refresh_token` in the user's profile row (using service role)
- Returns `{ access_token, expires_in }`

**2. `src/components/SpotifyPlayer.tsx`**
New component, structured like `GameTimer`:
- **Pill state (collapsed)**: Shows `♫ Playlist` with status text
  - Offline: `Not available offline`
  - No Spotify connection: `Connect to unlock the soundtrack`
  - Connected + playing: track name or `Playing...`
- **Expanded state**: Shows the Spotify Web Playback SDK player controls (play/pause/skip, track info, album art)
- Handles PKCE OAuth initiation (redirects to Spotify authorize URL)
- On mount, checks profile for stored tokens, refreshes if expired
- Uses `useBottomOffset` + `useIsMobile` for positioning (mirrors GameTimer pattern)

**3. `src/pages/SpotifyCallback.tsx`**
Route handler for `/spotify-callback`:
- Extracts `code` from URL params
- Calls the edge function to exchange code for tokens
- Stores access token in component state / context
- Redirects back to the game page (stored in `sessionStorage` before redirect)

**4. `src/lib/spotifyAuth.ts`**
PKCE helpers:
- `generateCodeVerifier()`, `generateCodeChallenge(verifier)`
- `buildAuthUrl(redirectUri, codeChallenge)` — builds Spotify authorize URL with scopes: `streaming`, `user-read-email`, `user-read-playback-state`, `user-modify-playback-state`
- `initiateSpotifyLogin(returnPath)` — stores code verifier + return path in sessionStorage, then redirects

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/spotify-callback` route |
| `src/pages/HostGame.tsx` | Add `<SpotifyPlayer />` alongside `<GameTimer />` |
| `src/pages/PlayGame.tsx` | Add `<SpotifyPlayer />` alongside `<DiceRoller />` |
| `src/i18n/en.ts` | Add translation keys for Spotify UI text |
| `src/i18n/fr.ts` | Add French translations |
| `index.html` | Add Spotify Web Playback SDK script tag |

### Translation Keys
```
"spotify.pill": "Playlist"
"spotify.connectPrompt": "Connect to unlock the soundtrack"
"spotify.offline": "Not available offline"
"spotify.playing": "Playing"
"spotify.paused": "Paused"
"spotify.connect": "Connect Spotify"
"spotify.disconnect": "Disconnect"
"spotify.premiumRequired": "Spotify Premium required"
```

### Implementation Order
1. Ask for Spotify Client ID + Client Secret (via `add_secret`)
2. Run database migration (add columns to profiles)
3. Create edge function `spotify-token-exchange`
4. Create `spotifyAuth.ts` helpers
5. Create `SpotifyCallback` page + route
6. Create `SpotifyPlayer` component
7. Wire into HostGame + PlayGame
8. Add translations

