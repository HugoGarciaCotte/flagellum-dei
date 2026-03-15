

## Add paused state + other pending changes to ambiance pill

**File: `src/components/GameTimer.tsx`**

The ambiance pill needs three states for its text after "Ambiance :":

| State | Condition | Text |
|---|---|---|
| Not started | `elapsed === 0 && !running` | *Start the timer to begin* |
| Paused | `elapsed > 0 && !running` | *Timer paused* |
| Running, no event yet | `running && activeAmbianceIdx < 0` | *(empty)* |
| Running, event active | `running && activeAmbianceIdx >= 0` | Truncated event text |

The "not started" and "paused" messages use `opacity-80 italic` styling.

**Files: `src/i18n/en.ts` + `src/i18n/fr.ts`**

Add keys:
- `timer.startToBegin`: "Start the timer to begin" / FR equivalent
- `timer.paused`: "Timer paused" / FR equivalent

This is part of the larger set of pending changes (pill color matching primary, position swap for GM). Those remain as planned — this adds the paused state text.

