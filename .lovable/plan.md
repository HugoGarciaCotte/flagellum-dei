

## Add Timer to HostGame (Bottom-Left)

### New Component: `src/components/GameTimer.tsx`
A fixed bottom-left floating timer button/widget:
- **Collapsed state**: A `Timer` icon button in the bottom-left corner
- **Expanded state**: Shows elapsed minutes (just the number + "min"), with Start, Pause, and Reset buttons
- Uses `useState` for running/paused state and `useEffect` with `setInterval` (1-second tick internally, but display only shows whole minutes)
- Display format: `0 min`, `1 min`, `12 min` — no hours, no seconds

### Update: `src/pages/HostGame.tsx`
- Import and render `<GameTimer />` alongside the existing `<DiceRoller />` at the bottom of the page
- Position it bottom-left (the DiceRoller is bottom-right)

### UI Details
- Fixed position `bottom-4 left-4`
- Small card/popover that expands when the timer button is clicked
- Three icon buttons: Play, Pause, RotateCcw (reset)
- Styled consistently with the existing DiceRoller aesthetic

