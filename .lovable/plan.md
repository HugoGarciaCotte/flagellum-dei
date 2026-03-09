

## Replace Skull icons with 🜹 logo symbol

The Skull icon from lucide-react is used in 4 files as a branding element. Replace all instances with the 🜹 alchemical symbol rendered as a styled `<span>`.

### Create a reusable Logo component

**New file: `src/components/Logo.tsx`**
A simple component that renders "🜹" in gold, accepting `className` for sizing:
```tsx
const Logo = ({ className }: { className?: string }) => (
  <span className={cn("font-serif text-primary", className)}>🜹</span>
);
```

### Replace Skull imports and usages

**`src/pages/Home.tsx`** — Remove `Skull` from lucide import, replace 5 `<Skull>` instances with `<Logo>`:
- Header logo (line 38)
- "The World" section decorative icon (line 90)
- Final CTA section (line 207)
- Footer (line 239)

**`src/pages/Dashboard.tsx`** — Replace `<Skull>` in PageHeader (line 173) with `<Logo>`

**`src/pages/Admin.tsx`** — Replace `<Skull>` in PageHeader (line 107) with `<Logo>`

**`src/pages/HostGame.tsx`** — Replace `<Skull>` in PageHeader (line 176) with `<Logo>`

### Files to edit
- `src/components/Logo.tsx` (new)
- `src/pages/Home.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Admin.tsx`
- `src/pages/HostGame.tsx`

