

## Plan: Minimal sync indicator

### Change

**`src/components/OfflineBanner.tsx`** — Replace the full-width syncing and synced banners with a small icon in the bottom-left corner:

1. **Syncing state**: Small `Loader2` spinner (h-5 w-5) fixed to bottom-left with subtle background, no text.
2. **Just-synced state**: Small `Check` icon in same position, fade out after 1.5s (reduced from 3s). Add opacity transition for smooth fade.
3. **Offline banner**: Keep as-is (full width, destructive — important to notice).

The syncing/synced indicator becomes a `fixed bottom-4 left-4` rounded pill with just the icon, ~32px, semi-transparent background.

