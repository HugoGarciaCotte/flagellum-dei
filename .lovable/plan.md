

## Add ambiance event indicator on collapsed timer button

**What**: When the timer is collapsed and a new ambiance event becomes the active one (i.e. `activeAmbianceIdx` changes), show a brief visual indicator — a small pulsing dot on the collapsed button.

**How** (single file: `src/components/GameTimer.tsx`):

1. Track the previous `activeAmbianceIdx` with a `useRef`. When it changes to a new value (and is >= 0), set a `newEvent` state to `true`.
2. After ~3 seconds, reset `newEvent` to `false`.
3. In the collapsed button (lines 50-69), when `hasAmbiance && newEvent` is true, render a small pulsing amber/primary dot (absolute positioned, top-right of the button) — similar to a notification badge. Use `animate-pulse` from Tailwind.

This gives the GM a subtle nudge that a new ambiance cue has triggered, without being intrusive.

