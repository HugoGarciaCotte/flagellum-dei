

## Convert Logo from Unicode character to SVG icon

The 🜹 Unicode alchemical symbol renders inconsistently across browsers/platforms and is hard to center because font metrics vary. The solution is to convert it into an inline SVG component with precise control over sizing and alignment.

### Approach

Create the Logo as an SVG element instead of a text `<span>`. The SVG already exists in `public/favicon.svg` — extract the symbol path and render it inline. This gives pixel-perfect centering at any size.

### Changes

**`src/components/Logo.tsx`** — Replace the Unicode span with an inline SVG that renders the 🜹 symbol as an SVG `<text>` element (matching the favicon approach), sized via `width`/`height` props or className. The SVG viewBox ensures perfect centering regardless of font rendering.

```tsx
import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("inline-block", className)}
    style={{ width: "1em", height: "1em" }}
  >
    <text
      x="256" y="280"
      fontSize="420"
      fill="currentColor"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="serif"
    >
      🜹
    </text>
  </svg>
);

export default Logo;
```

Key benefits:
- `currentColor` inherits the parent text color (gold/primary) automatically
- `1em` sizing makes it scale with the font-size context (controlled via className like `text-xl`, `text-5xl`)
- The SVG viewBox with fixed coordinates ensures the symbol is always perfectly centered
- No more font-metric alignment hacks (`translate-y`, `leading-none`)

### Files to edit
- `src/components/Logo.tsx`

