

## Red dot notification on ambiance pill

### Change
Replace the current 3-second blink (`animate-pulse`) with a persistent red dot badge on the pill corner. The dot appears when a new ambiance event triggers and only disappears when the GM opens the expanded ambiance track.

### Implementation — `src/components/GameTimer.tsx`

1. **Change `newEvent` behavior**: Instead of auto-clearing with `setTimeout`, set `newEvent = true` when a new ambiance index is reached, and only clear it when `expanded` becomes `true`.

2. **Update the effect** (lines 61-69): Remove the `setTimeout` — just set `newEvent(true)` on new ambiance index.

3. **Add a clearing effect**: When `expanded` becomes `true`, set `newEvent(false)`.

4. **Replace pulse class with red dot**: Remove the `animate-pulse` conditional class. Add a small absolute-positioned red dot element inside the pill button:
   ```tsx
   {newEvent && (
     <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-primary" />
   )}
   ```
   Add `relative` to the button's className so the dot positions correctly.

### Files
| File | Change |
|------|--------|
| `src/components/GameTimer.tsx` | Replace blink with red dot badge; clear on expand |

