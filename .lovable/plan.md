

## Fix 🜹 Vertical Centering

The glyph 🜹 has ~23% blank space at the top and ~5% at the bottom, making it look lower than surrounding text. The fix: shift it upward inside the SVG by adjusting the `y` attribute from `280` to `240` (roughly 18% of the 512 viewBox). This fixes it everywhere the `Logo` component is used.

### Changes

**`src/components/Logo.tsx`** — Change `y="280"` to `y="240"` on the `<text>` element.

