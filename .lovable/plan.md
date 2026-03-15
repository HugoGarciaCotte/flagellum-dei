

## Auto-restart timer on ambiance track change

When the GM navigates to a section that has its **own** ambiance track (not inherited), the timer should reset to 0 and auto-start. Sections that inherit their parent's track should not trigger a reset.

### How it works

The `resolvedAmbianceTrack` in `HostGame.tsx` already resolves to the correct track — either the section's own or the inherited parent one. When the track reference changes (new array identity), it means a new ambiance context started.

### Change

**`src/components/GameTimer.tsx`** — Track the ambiance array by reference and reset+start when it changes:

- Add a `useRef` to store the previous `ambianceTrack` reference.
- Add a `useEffect` watching `ambianceTrack`: if the ref differs from the current value (and both are non-empty), call `setElapsed(0)`, `setRunning(true)`, and reset `prevAmbianceIdxRef` to `-1`.
- Update the ref after comparison.

```tsx
const prevTrackRef = useRef<AmbianceEntry[] | undefined>();

useEffect(() => {
  if (prevTrackRef.current && ambianceTrack && prevTrackRef.current !== ambianceTrack) {
    setElapsed(0);
    setRunning(true);
    prevAmbianceIdxRef.current = -1;
  }
  prevTrackRef.current = ambianceTrack;
}, [ambianceTrack]);
```

This works because `resolvedAmbianceTrack` in `HostGame.tsx` is a `useMemo` — it returns the same array reference when the section inherits (parent track unchanged), and a new reference when a section has its own `ambianceTrack` array.

One file changed: `src/components/GameTimer.tsx`.

