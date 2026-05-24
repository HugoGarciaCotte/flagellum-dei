## Problem

The previous pass replaced `Trash2` (Lucide SVG) with a Unicode glyph 🗑 (U+1F5D1). That glyph renders as a broken tofu box or an inconsistent colored emoji depending on the OS/browser font stack. This is worse than the original issue.

## Fix

Revert to **all-Lucide SVG icons** in the `CharacterDetailsDialog` header, and solve alignment with a shared wrapper instead of swapping icon systems.

### Changes in `src/components/CharacterDetailsDialog.tsx`

1. **Re-import** `ArrowLeft`, `Pencil`, `Trash2`, `X` from `lucide-react`.
2. **Remove** the `Glyph` and `TrashGlyph` helper components.
3. **Keep `HeaderIconButton`** but change it to accept a Lucide icon as `children` (a `<Trash2 />` element, etc.) instead of a Unicode `<span>`. Inside, render children inside a `flex items-center justify-center` box — no `translate-y` nudges needed because SVGs are already pixel-centered.
4. **Standardize all four icons** to `h-4 w-4` inside `h-8 w-8` buttons, all using `text-muted-foreground` at rest, with `hover:text-foreground` (or `hover:text-destructive` for the trash via `tone="destructive"`).
5. **Title alignment**: drop the `translate-y-[1px]` hack from the title too; with all icons being SVGs and the row using `items-center`, no manual nudge is needed.

### Why this works

- SVG icons have predictable bounding boxes — `items-center` aligns them perfectly with the title's text baseline center.
- One icon family (Lucide) = one visual weight, one stroke width, one rendering path across all platforms.
- The `HeaderIconButton` wrapper still gives us the unified hover/tone behavior we wanted (no persistent red trash).

### Verification

Screenshot the dialog header at desktop and mobile widths, zoom into the top 60px, confirm all four icons render as crisp monochrome SVGs on the same optical center line.
