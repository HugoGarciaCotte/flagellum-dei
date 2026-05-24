## Problem

Measured from desktop screenshots (1440×900):

- Dashboard "Sign Out" / "Flagellum Dei" bar: 56px tall, title centered to within 1px. ✅
- Edit Character dialog bar: 44px tall, title glyphs centered at row ~16 while bar center is at row ~22 → title sits **~6px above center**. ❌

Cause: in `src/components/CharacterDetailsDialog.tsx` the title `<span>` lacks `leading-none`, so the display serif inherits default line-height and its visible glyphs ride high inside the flex row. The dashboard `PageHeader` avoids this because its h1 uses `leading-none`.

Mobile looks fine because `safe-top` adds top inset padding that compensates, and the misalignment is less perceptible at small sizes.

## Change

Single file: `src/components/CharacterDetailsDialog.tsx`, header block (lines 70–82).

1. Add `leading-none` to the title `<span>` so the glyph box sits in the true center of the flex row.
2. Add `leading-none` to the back-arrow `<span>` for consistency (same reason).
3. Give the header row a stable height (`min-h-12`) so it doesn't depend on inner content metrics — matches the pattern used by `PageHeader`.

No other files, no behavior changes, no logic changes. After the edit I'll re-screenshot the edit dialog at desktop width, re-measure the title's pixel center against the bar center, and confirm the offset is ≤1px.
