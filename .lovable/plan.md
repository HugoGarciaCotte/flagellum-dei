

## Fix Text Vertical Centering in Header

The issue is the "FLAGELLUM DEI" text isn't visually centered in its container. The Cinzel font has tall ascenders and extra line-height, so even with `items-center`, the text's visual center sits higher than the container's center.

### Changes

**`src/components/BrandTitle.tsx`**
- Add `leading-none` to the text `<span>` to collapse excess line-height from the Cinzel font, so `items-center` aligns the actual visual text center.

**`src/components/PageHeader.tsx`**
- Add `leading-none` to the `<h1>` for the same reason — the title text also uses `font-display` (Cinzel).

These are small CSS-only changes that fix the perceived misalignment caused by the font's metrics.

