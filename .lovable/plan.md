

## Fix: Inline music button opens external tab instead of playing in-app

### Root Cause

In `WikiSectionTree.tsx` line 155:
```typescript
onPlayTrack?.(url) ?? window.open(url, "_blank");
```

`onPlayTrack` returns `void` (i.e. `undefined`). The nullish coalescing operator `??` treats `undefined` as nullish, so it **always** also calls `window.open(url, "_blank")` — even when `onPlayTrack` successfully fired.

### Fix

**`src/components/WikiSectionTree.tsx`** — Replace the `??` with a simple if/else:

```typescript
if (onPlayTrack) {
  onPlayTrack(url);
} else {
  window.open(url, "_blank");
}
```

One-line change, no other files affected.

