

## Black & White + Gold Color Theme

Retheme the entire app from the current warm parchment/sepia palette to a stark black-and-white scheme with gold accents. The key is ensuring all text remains readable against its background.

### Changes

#### 1. `src/index.css` — Redefine all CSS custom properties

New palette:
- **background**: near-black (`0 0% 7%`) — the app's default canvas
- **foreground**: white (`0 0% 95%`) — default text, always readable on black
- **card**: dark grey (`0 0% 11%`) — slightly lifted from background
- **card-foreground**: white
- **primary**: gold (`43 74% 49%`) — accent color for CTAs, icons, highlights
- **primary-foreground**: black (`0 0% 5%`) — text on gold buttons
- **secondary**: dark grey (`0 0% 15%`)
- **secondary-foreground**: light grey (`0 0% 85%`)
- **muted**: dark grey (`0 0% 14%`)
- **muted-foreground**: medium grey (`0 0% 55%`) — subdued text, still readable on dark
- **accent**: gold-tinted dark (`43 30% 15%`)
- **accent-foreground**: white
- **destructive**: red stays (`0 65% 50%`)
- **border/input**: dark grey (`0 0% 18%`)
- **ring**: gold
- **Custom vars**: `--gold`, `--gold-dim`, `--parchment` updated, `--blood`/`--mystic` kept

Sidebar variables updated to match.

#### 2. `src/pages/Home.tsx` — Adjust hardcoded colors

The landing page uses `bg-foreground` and `text-primary-foreground` for its dark hero. With the new theme where `background` is already black, these need updating:
- Replace `bg-foreground text-primary-foreground` with the standard `bg-background text-foreground`
- Replace `text-primary-foreground/60` with `text-foreground/60` (or `text-muted-foreground`)
- Replace `text-primary-foreground/50` with `text-foreground/50`
- Replace `bg-foreground/90` with `bg-background/90`
- The landing page will now naturally be dark since `background` itself is near-black

#### 3. `src/components/FeatCategoryBadges.tsx` — Adjust badge colors

The current emerald/amber/blue/zinc/violet badges are fine against a dark background. No change needed — they already use `/20` opacity backgrounds which work on dark surfaces.

#### 4. `tailwind.config.ts` — No structural changes needed

The color definitions all reference CSS variables, so updating `index.css` propagates everywhere.

### Readability Audit

With this scheme:
- White text on black background: high contrast
- Gold text on black: high contrast
- `muted-foreground` (55% grey) on black (7%): sufficient contrast (~7:1)
- Black text on gold buttons: high contrast
- No grey-on-black or dark-on-dark text anywhere — the old `foreground` (dark) is now white, old `background` (light) is now near-black

