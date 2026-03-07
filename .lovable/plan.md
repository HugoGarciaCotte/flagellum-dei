

## Fix: Timer collapsed button display

**Issues:**
1. Minutes always show even when timer is paused/not started (should only show when running)
2. Button uses `size="icon"` but also has text content, causing layout issues

**Changes in `src/components/GameTimer.tsx`** (lines 29-43):

- Conditionally show the minutes label only when `running && elapsed > 0`
- When no time is shown (paused/reset), render just the icon with `size="icon"` and proper round styling
- When time is shown (running), drop `size="icon"`, use `px-4` for proper width, and ensure icon + text are well-spaced with `flex items-center gap-2`

