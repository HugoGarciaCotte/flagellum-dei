

## Fix: Cannot scroll in Character Edit screen

### Root Cause

The Edit Character dialog (Dashboard.tsx line 272-294) uses a full-screen `DialogContent` with `fixed inset-0 h-full`. However, the base `DialogContent` component applies `left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]` positioning and `grid` layout by default. These default styles conflict with the `inset-0` override, and the `ScrollArea` with `flex-1` inside a `flex flex-col h-full` container doesn't get a proper height constraint because the parent grid layout doesn't constrain it correctly.

The same pattern is used for the "Create Character" dialog (line 220-238) — if that one scrolls fine, it's likely because the wizard content is shorter. But the edit screen with CharacterFeatPicker can grow taller than the viewport.

### Fix

**File: `src/pages/Dashboard.tsx`** — Add `overflow-hidden` to the edit character `DialogContent` (line 273) so the flex/scroll layout works correctly within the fixed container:

```
className="fixed inset-0 max-w-none w-full h-full rounded-none p-0 translate-x-0 translate-y-0 left-0 top-0 border-none overflow-hidden"
```

Also ensure the `ScrollArea` viewport properly constrains. The `flex-1` on ScrollArea needs `min-h-0` on its flex parent to allow flex children to shrink below their content size:

```tsx
<div className="flex flex-col h-full min-h-0">
```

This same fix should be applied to both the edit dialog (line 274) and the create dialog (line 221) for consistency.

### Files to edit
- `src/pages/Dashboard.tsx` (lines 273-274 and 220-221)

