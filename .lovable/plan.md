

## Crop the 🜹 SVG to Remove Top Whitespace

### Changes to `src/components/Logo.tsx`

1. **Revert `y`** back to original `280` (undo the previous failed fix)
2. **Change `viewBox`** from `"0 0 512 512"` to `"0 92 512 420"` — this crops the top 18% (92px) and trims the bottom, so only the visible glyph area remains
3. The `width: 1em; height: 1em` stays, so it still scales with text — but the rendered content now excludes the blank top region

This modifies the SVG itself (its coordinate window) rather than trying to reposition the glyph within it.

### File
- `src/components/Logo.tsx`

