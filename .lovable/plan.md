

## Apply fixed-shell layout to Dashboard and PlayGame

The same drag-scroll bug (sticky header scrolling away, fixed bottom elements displacing) affects all pages using `PageHeader` with `sticky top-0` + `min-h-screen` + fixed bottom elements.

### Pages to fix

| Page | Has sticky header | Has fixed bottom elements | Needs fix |
|------|-------------------|--------------------------|-----------|
| **HostGame** | Yes | Timer, Dice, Guest/Offline banners | Already planned |
| **PlayGame** | Yes | Dice, character bar, Guest/Offline banners | **Yes** |
| **Dashboard** | Yes | Guest/Offline banners | **Yes** |
| Admin pages | Yes | None significant | Low priority, but same pattern |
| Home (landing) | `fixed` header already | None | No |
| Auth/Install/etc | No header | None | No |

### Changes

**`src/pages/HostGame.tsx`** — Convert to fixed shell (already approved)

**`src/pages/PlayGame.tsx`** — Same conversion:
- Outer div: `fixed inset-0 flex flex-col` instead of `min-h-screen flex flex-col`
- Wrap main content + install link in `div.flex-1.overflow-y-auto`
- The character bottom bar, dice roller, and banners stay outside the scroll container as fixed elements

**`src/pages/Dashboard.tsx`** — Same conversion:
- Outer div: `fixed inset-0 flex flex-col`
- Wrap content below header in `div.flex-1.overflow-y-auto`

**`src/components/PageHeader.tsx`** — Remove `sticky top-0`:
- Drop `sticky top-0` from the header element
- Keep `z-10`, `backdrop-blur`, border, safe-area padding
- This is shared across all pages, so it fixes them all at once

### Not changing
- Admin pages: same fix applies automatically via `PageHeader` change; their content is simple enough that the `min-h-screen` wrapper won't cause visible issues, but we should convert them too for consistency
- Home/Auth/Install/NotFound: different layout patterns, not affected

