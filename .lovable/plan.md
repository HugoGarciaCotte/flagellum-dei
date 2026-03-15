

## Fuse Timer into Ambiance Pill (updated)

Rewrite `src/components/GameTimer.tsx` to merge timer and ambiance into one component.

### Key change from previous plan
**If there is no ambiance track, render nothing.** The timer is only useful alongside ambiance — no ambiance means no pill, no FAB, no timer UI at all.

### Collapsed state (single pill)
- One pill: timer icon + elapsed minutes (if running, e.g. `12m`) + `Ambiance :` + current ambiance text
- Click opens expanded panel
- Pulses on new ambiance event

### Expanded state (single card, bottom corner)
- **Sticky header**: title, close button, time display (`12:34 min`), play/pause + reset buttons
- **Scrollable body**: ambiance track table with active row highlighted
- Backdrop click closes

### Rendering logic
```
if (!hasAmbiance) return null;
```

### File changed
`src/components/GameTimer.tsx` — full rewrite with single `expanded` boolean state, no separate `open`/`ambianceOpen`. No new translation keys needed.

