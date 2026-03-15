

## Ambiance pill: show empty label when no event active

**File: `src/components/GameTimer.tsx`**

Simplify the pre-first-event state: when `activeAmbianceIdx === -1`, the pill just shows **"Ambiance Track:"** with nothing after it. No preview of upcoming events, no muted text.

- Show the pill whenever `hasAmbiance` is true (not gated on `activeAmbianceIdx >= 0`)
- Text after "Ambiance Track:" is only rendered when `activeAmbianceIdx >= 0`
- Otherwise, empty — just the label

This is part of the larger yellow-pill implementation that also removes the Tabs from the popup and adds the standalone ambiance panel.

