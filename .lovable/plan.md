

## Auto-start timer on first ambiance track

### Problem
The timer auto-restarts when switching between sections with *different* tracks (line 29: `prevTrackRef.current !== ambianceTrack`), but on the very first section activation `prevTrackRef.current` is `undefined`, so the condition `undefined !== newTrack` is true — this should already work. Let me re-check: actually `prevTrackRef` starts as `undefined`, and the first time a track arrives it would be `undefined !== someTrack` which is `true`, so it should auto-start.

Wait — the issue is that `prevTrackRef` is initialized as `undefined`, and on mount (before any section is selected), `ambianceTrack` could also be `undefined` (no section → root track which may be undefined). So `prevTrackRef.current` gets set to `undefined`. Then when a section is selected and has a track, `undefined !== trackArray` is true, so it should start.

But if the root scenario has an ambiance track too, then on mount `prevTrackRef` gets set to that root track. When the user selects a section that inherits the same root track (same reference), the condition fails. But for a section with its *own* track, it would be a different reference.

The real issue: on initial render, `prevTrackRef.current` starts as `undefined`, then the effect runs and sets it to whatever `ambianceTrack` is (could be the root track or undefined). The condition `prevTrackRef.current && ambianceTrack && prevTrackRef.current !== ambianceTrack` requires `prevTrackRef.current` to be truthy — so if it was `undefined` on first load, the auto-start is skipped.

### Fix

**`src/components/GameTimer.tsx`** — Change the auto-start condition (around line 28-34):

Current:
```ts
if (prevTrackRef.current && ambianceTrack && prevTrackRef.current !== ambianceTrack) {
```

New:
```ts
if (ambianceTrack && ambianceTrack.length > 0 && prevTrackRef.current !== ambianceTrack) {
```

Remove the requirement that `prevTrackRef.current` must be truthy. This way, the first time a valid ambiance track appears (transitioning from `undefined`), the timer auto-starts.

One line change, one file.

