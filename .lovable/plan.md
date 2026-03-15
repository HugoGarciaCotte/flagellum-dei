

## Fix scroll isolation in ambiance panel (without locking body)

### Problem
Radix `ScrollArea` uses a custom scrollbar overlay but the underlying viewport may not properly capture wheel events, causing them to propagate to the page beneath.

### Recommended approach
Replace `ScrollArea` with native `overflow-y-auto` + `overscroll-behavior: contain`. This is the standard CSS solution: when the cursor is over the panel and there's content to scroll, the panel scrolls; when you reach the end, `overscroll-contain` prevents the scroll from chaining to the page. If the cursor is on the background, the page scrolls normally. No body lock, no JS hacks.

### Change — `src/components/GameTimer.tsx`

**Line 1-5**: Remove the `ScrollArea` import.

**Line 151**: Replace `<ScrollArea className="flex-1 min-h-0">` with a plain `<div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">`, and remove the closing `</ScrollArea>` tag (replace with `</div>`).

One file, swap one component for a native div.

