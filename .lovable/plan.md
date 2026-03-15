

## Remove dialog animations to fix clipping

The fullscreen dialogs clip at the top because the base `DialogContent` has `data-[state=open]:slide-in-from-top-[48%]` and similar animation classes that conflict with the `inset-0` fullscreen override — `tailwind-merge` can't strip conditional `data-[state=...]` classes.

The simplest fix: remove all the `animate-in`/`animate-out` transition classes from the base `DialogContent` in `dialog.tsx`.

### Change

**`src/components/ui/dialog.tsx`** (line 39) — Strip the animation classes from the default `DialogContent` className:

Before:
```
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
```

After:
```
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg"
```

This removes all `duration-200`, `animate-in/out`, `fade`, `zoom`, and `slide` classes. Dialogs will open/close instantly — no clipping.

