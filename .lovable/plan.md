

## Fix: Spotify "Invalid token scopes" error

### Root Cause

The console shows `"Spotify auth error: Invalid token scopes."` — the Web Playback SDK is rejecting the access token because it's missing required scopes.

Two issues:

1. **Missing scope**: The Spotify Web Playback SDK also requires `user-read-private` in addition to the current scopes. Without it, the SDK rejects the token.

2. **Auth error loop**: When the SDK fires `authentication_error`, the component clears `accessToken` from state — but then `refreshTokenFromProfile()` immediately reloads the same bad token from the database, creating a loop. The pill never becomes clickable/expandable because the token keeps getting set and cleared.

### Changes

**`src/lib/spotifyAuth.ts`**
- Add `user-read-private` to `SPOTIFY_SCOPES`
- Add `show_dialog=true` to the authorize URL params to force Spotify to re-prompt for the updated scopes

**`src/components/SpotifyPlayer.tsx`**
- On `authentication_error`: also clear the stored profile tokens (set a flag to skip `refreshTokenFromProfile` so it doesn't reload the bad token)
- This breaks the loop and lets the user re-authorize cleanly

### After deployment
You'll need to click the Spotify pill again to re-authorize with the new scopes. Spotify will show the consent screen again because of `show_dialog=true`.

