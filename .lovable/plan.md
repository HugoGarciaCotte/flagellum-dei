

## Improve Music Tag Insertion & Inline Button Styling

### Two issues:

### 1. Name resolution on tag insert isn't working reliably

The current code tries to resolve via Spotify API using `sessionStorage.getItem("spotify_access_token")`, but the token may not be there. The URL parsing also has a bug: Spotify URLs like `https://open.spotify.com/track/abc123` have path `/track/abc123`, so `parts` = `["track", "abc123"]` — the fetch goes to `/v1/tracks/abc123` which is correct. But the token availability is the real issue.

**Fix**: Extract the name resolution into a shared helper. If no token in sessionStorage, also try fetching from the user's profile (where tokens are persisted). Add a toast/feedback so the GM knows if name resolution succeeded or fell back to URL. If resolution fails, still insert the tag but with a placeholder name the GM can manually edit.

### 2. Inline music button should look more clearly like a music button

Current rendering: `▶ Track Name` as a small pill. This doesn't scream "music."

**Fix**: 
- Change the `▶` to a `♫` or `🎵` music symbol
- Add a green Spotify-like accent color to make it visually distinct from regular text
- Add a subtle music note icon or make the pill more prominent with a border

### Files to edit

**`src/lib/parseWikitext.ts`**
- Change the inline button content from `▶ ${name}` to `♫ ${name}` (or `🎵`)

**`src/index.css`**
- Update `.wiki-queue-track` styles: add a left border or background tint in green/gold to make it visually distinct as a music control, increase padding slightly

**`src/components/ScenarioEditorPanel.tsx`**
- Extract Spotify name resolution into a helper function (DRY — currently duplicated for playlist and queue_track)
- Also try reading the token from the user's profile if not in sessionStorage
- Show a toast if name was resolved vs fell back to URL

