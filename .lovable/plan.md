

## Add 3-second flash animation back alongside red dot

### Change
Add a `flashing` state that triggers a 3-second `animate-pulse` effect on the pill button when a new ambiance event fires, while keeping the persistent red dot (cleared only on expand).

### Implementation — `src/components/GameTimer.tsx`

1. **Add `flashing` state**: `const [flashing, setFlashing] = useState(false);`

2. **Update the `activeAmbianceIdx` effect** (lines 61-66): When a new event is detected, also set `setFlashing(true)` and add a `setTimeout(() => setFlashing(false), 3000)`.

3. **Add flash class to pill button** (line 94): Conditionally add `animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]` when `flashing` is true.

4. **Keep the red dot as-is** — it stays until the GM opens the track.

### Files
| File | Change |
|------|--------|
| `src/components/GameTimer.tsx` | Add `flashing` state with 3s timeout + pulse class on pill |

