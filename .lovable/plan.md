

## Fix: "Create Character" dialog header alignment

The issue: The fullscreen dialog overrides positioning with `inset-0 translate-x-0 translate-y-0 left-0 top-0`, but the default `DialogPrimitive.Close` button (the X) is positioned `absolute right-4 top-4` relative to the `DialogContent` — which conflicts with the custom header bar that already has its own layout with `flex items-center justify-between`.

The close button from `DialogContent` (line 45 in dialog.tsx) overlaps with the custom header, and because the header uses `safe-top` padding, the title and X end up misaligned vertically.

### Fix (2 changes)

**1. Dashboard.tsx (line 187-191)** — Add a manual close button inside the custom header, and hide the default one:

```tsx
<DialogContent className="fixed inset-0 max-w-none w-full h-full rounded-none p-0 translate-x-0 translate-y-0 left-0 top-0 border-none overflow-hidden [&>button:last-child]:hidden">
  <div className="flex flex-col h-full min-h-0">
    <div className="border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0 safe-top">
      <span className="font-display text-base font-medium text-foreground">
        {t("dashboard.createCharacter")}
      </span>
      <DialogClose className="rounded-sm opacity-70 hover:opacity-100">
        <X className="h-5 w-5" />
      </DialogClose>
    </div>
```

This hides the auto-injected close button via `[&>button:last-child]:hidden` and places a properly aligned close button inside the flex header row.

**2. Apply same fix to "Edit Character" dialog** (~line 235-240) — same pattern: hide default close, add `DialogClose` with X inside the header bar.

**3. Scan other fullscreen dialogs** in `PlayGame.tsx` and `HostGame.tsx` for the same pattern and apply consistently.

### Files to edit
- `src/pages/Dashboard.tsx` (Create + Edit character dialogs)
- `src/pages/PlayGame.tsx` (Create + Edit character dialogs)

