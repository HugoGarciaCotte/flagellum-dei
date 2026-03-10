

## Align Logo with Text Across the App

The uploaded SVG is already being used via `src/assets/logo.svg` and `public/favicon.svg`. The issue is vertical alignment — the logo `<img>` needs to sit at the same center of gravity as adjacent text.

### Changes

**`src/components/Logo.tsx`**
- Add `vertical-align: middle` and a slight negative `margin-top` (about `-0.1em`) to visually align the center of gravity of the square icon with text baselines. The `inline-block` default aligns to the baseline which pushes the icon too high/low.

```tsx
const Logo = ({ className }: { className?: string }) => (
  <img
    src={logoSvg}
    alt="🜹"
    className={cn("inline-block align-middle", className)}
    style={{ width: "1em", height: "1em" }}
  />
);
```

**`src/components/PageHeader.tsx`**
- The Logo and title `<h1>` are siblings in a `flex items-center` container — flex alignment handles vertical centering. Ensure the Logo size matches well with the title text. Current `text-xl` on Logo is fine.

**`src/components/BrandTitle.tsx`**  
- Already uses `flex items-center` — no structural change needed. The `align-middle` on Logo will help in any non-flex context.

**`src/pages/Auth.tsx`**
- Logo at `text-5xl` in the hero and `text-sm` in the tab trigger — `align-middle` fixes alignment in the tab trigger context where it sits inline with "Sign Up" text.

No other files need changes — the Logo component is the single source, and fixing alignment there propagates everywhere.

