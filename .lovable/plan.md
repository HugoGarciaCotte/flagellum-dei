

## Always-Playing Spotify Embed with Compact Pill

### Problem
Currently the iframe only renders when expanded. When collapsed to a pill, playback stops. The user wants:
1. The iframe to always be present (even when "collapsed") so music keeps playing
2. Auto-play when the iframe loads or its URL changes

### Approach

**`src/components/SpotifyPlayer.tsx`**

- Always render the iframe, but when collapsed, hide it visually (use `hidden` or `sr-only` class, or position it off-screen — note: `display:none` will stop playback, so use `opacity-0 pointer-events-none h-0 overflow-hidden` instead)
- When expanded, show the full panel with header + iframe as today
- For auto-play: append `&autoplay=1` to the embed URL — Spotify's embed API supports this parameter but browsers may block it without prior user interaction. Since the GM clicks the pill first, subsequent iframe loads should be allowed to autoplay.
- Use `key={embedUrl}` on the iframe to force remount (and thus autoplay) when the URL changes

### Changes

**Single file: `src/components/SpotifyPlayer.tsx`**

1. Remove the early return when `!expanded` — instead always render the iframe
2. When collapsed: render a pill button + the iframe in a visually hidden container (`w-0 h-0 overflow-hidden` or `absolute opacity-0 pointer-events-none`)
3. When expanded: show full panel as today
4. Add `&autoplay=1` to the embed URL in `toEmbedUrl()`

