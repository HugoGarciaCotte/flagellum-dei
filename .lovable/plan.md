

## Fix: Ambiance track not scrollable

### Problem
The `ScrollArea` inside the expanded panel has `flex-1` but lacks `min-h-0`, which is required for flex children to shrink below their content size and allow overflow scrolling. Without it, the flex item grows to fit all content and the ScrollArea never activates.

### Change

**`src/components/GameTimer.tsx`** line 148:

Change:
```tsx
<ScrollArea className="flex-1">
```
To:
```tsx
<ScrollArea className="flex-1 min-h-0">
```

One line change, one file.

