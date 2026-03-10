

## Fix ornamental divider star black box

**Problem**: The `::after` pseudo-element on `.ornamental-divider` uses `background: hsl(var(--background))` as a mask to hide the line behind the star. This fails whenever the divider sits on a container with a different background (cards, sections with overlays, etc.), creating a visible black rectangle.

**Fix**: Remove the `background` property from `.ornamental-divider::after` entirely. The ✦ character is a solid glyph — a 1px semi-transparent line behind it is visually imperceptible. No masking needed.

**File**: `src/index.css` line 99 — delete the `background` line.

