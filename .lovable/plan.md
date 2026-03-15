

## Fix: Spotify Track URI Conversion Broken by `/intl-fr/` Path Segment

### Root Cause
The `urlToUri()` function in `SpotifyPlayer.tsx` naively takes the first two path segments. Spotify URLs with locale prefixes like `/intl-fr/track/ID` produce `spotify:intl-fr:track` instead of `spotify:track:ID`.

### Fix

**`src/components/SpotifyPlayer.tsx`** (lines 16-23): Update `urlToUri()` to filter out `intl-*` locale segments before building the URI:

```typescript
function urlToUri(url: string): string {
  try {
    const u = new URL(url);
    // Filter out locale segments like "intl-fr"
    const parts = u.pathname.split("/").filter(p => p && !p.startsWith("intl-"));
    if (parts.length >= 2) return `spotify:${parts[0]}:${parts[1]}`;
  } catch {}
  return url;
}
```

This single line change fixes the conversion for all Spotify URLs with locale prefixes. 1 file, 1 line changed.

