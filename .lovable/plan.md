

## Two Quick UX Fixes

### 1. Timer: Click outside to close (`src/components/GameTimer.tsx`)

When `open` is true, add a full-screen transparent backdrop behind the timer popup. Clicking it calls `setOpen(false)`.

- Wrap the expanded timer in a `<>` fragment with a `fixed inset-0` click-catcher div behind the popup div
- The click-catcher has no background (transparent) and a lower z-index than the popup

### 2. Dice: Click overlay during rolling to skip to result (`src/components/DiceRoller.tsx`)

- Store the rolling timeout ID in a ref so it can be cleared early
- Store the final result in a ref at roll start (pre-compute it) so skipping can use it
- Add an `onClick` handler on the overlay div: if `phase === "rolling"`, clear the interval and timeout, immediately show the result, and start the auto-dismiss timer
- During `phase === "result"`, clicking the overlay dismisses it immediately

