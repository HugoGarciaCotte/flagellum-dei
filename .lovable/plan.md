

## Make Player Background Fullscreen

Currently the player view shows the background inside a `Card` component in the `<main>` area, with the section title overlaid. The user wants:
1. Background should be **fullscreen** (on the entire page, not just a card)
2. Remove the section title display — it's not needed

### Changes — `src/pages/PlayGame.tsx`

- Move the `activeBg` style from the `Card` to the root `<div className="min-h-screen ...">` wrapper, so the background covers the entire viewport
- Remove the `Card` rendering for the active section case — since we no longer show the section title, the main area when a section is active can just be empty (or show the waiting text when no section is set)
- Keep the "waiting for GM" state as-is for when no section is active
- The background gradient overlay should use lower opacity to let the image be more prominent fullscreen

Essentially:
```
// Root div gets background style when activeBg exists
<div className="min-h-screen bg-background flex flex-col"
  style={activeBg ? {
    backgroundImage: `linear-gradient(...), url(${activeBg})`,
    backgroundSize: "cover", backgroundPosition: "center",
  } : undefined}
>
```

The `<main>` section simplifies to only show the "waiting for GM" state when no `currentSectionId` is set. When a section is active, the main area is empty (the fullscreen background IS the content).

