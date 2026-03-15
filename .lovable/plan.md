

## Fix: Spotify Client ID Mismatch

### Root Cause

The `INVALID_CLIENT` error occurs because there are **two different Spotify client IDs** in play:

- **Frontend** (`useSpotifyAuth.ts` line 5): hardcoded as `0f359b30c2484879a3d42b57ac0aabab`
- **Backend secret** (`SPOTIFY_CLIENT_ID`): `2212a74fa26147aabc35a8c6ef66c9eb` (confirmed by edge function logs)

When the user clicks "Connect Spotify":
1. The frontend redirects to Spotify's `/authorize` with client ID `0f359b30...`
2. The user logs in to Spotify
3. Spotify redirects back with an auth code tied to client `0f359b30...`
4. The edge function exchanges the code using client ID `2212a74f...` from the secret
5. Spotify rejects it: **INVALID_CLIENT** — the code was issued for a different app

Additionally, the redirect URI must be `https://www.flagellum-dei.com/spotify-callback` and must be registered in the Spotify Developer Dashboard for the app with client ID `2212a74f...`.

### Plan

#### 1. Update frontend client ID to match backend secret

**`src/hooks/useSpotifyAuth.ts`** — change line 5:
```ts
// FROM:
const SPOTIFY_CLIENT_ID = "0f359b30c2484879a3d42b57ac0aabab";
// TO:
const SPOTIFY_CLIENT_ID = "2212a74fa26147aabc35a8c6ef66c9eb";
```

#### 2. Ensure redirect URI is correct

The `connect()` function already uses `window.location.origin + "/spotify-callback"` dynamically, which will resolve to `https://www.flagellum-dei.com/spotify-callback` on the published domain. No code change needed here.

#### 3. User action required (Spotify Dashboard)

You will need to ensure that `https://www.flagellum-dei.com/spotify-callback` is added as an allowed Redirect URI in the Spotify Developer Dashboard for the app with client ID `2212a74fa26147aabc35a8c6ef66c9eb`.

### Files to Edit

| File | Change |
|------|--------|
| `src/hooks/useSpotifyAuth.ts` | Update `SPOTIFY_CLIENT_ID` constant to `2212a74fa26147aabc35a8c6ef66c9eb` |

