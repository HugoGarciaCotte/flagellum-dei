

## Fix scrolling inside expanded ambiance track panel

The issue is on line 115: the outer container uses `overflow-hidden` but the `ScrollArea` on line 151 needs a concrete height to scroll — `flex-1 min-h-0` only works if the parent is a proper flex column with a constrained height.

The parent div has `max-h-[60vh]` and `flex flex-col`, which should work. However, the header uses `sticky` positioning (line 117) instead of being a natural flex child — `sticky` doesn't remove elements from flow in flex containers, so the `ScrollArea` with `flex-1` doesn't get the remaining space properly.

### Fix — `src/components/GameTimer.tsx`

**Line 117**: Change `sticky top-0 z-10` to `shrink-0` — the header doesn't need sticky since it's already at the top of a flex column. Removing sticky ensures the flex layout correctly allocates remaining space to ScrollArea.

```tsx
// Line 117: from
<div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex flex-col items-center gap-2">
// to
<div className="shrink-0 bg-card border-b border-border p-4 flex flex-col items-center gap-2">
```

One line change, one file.

