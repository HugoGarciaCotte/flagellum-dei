

## Subtle PWA Install Hints

Add gentle "install as app" nudges woven into existing footers and content — no banners, no popups.

### Changes

**1. Home page clarity strip** (`src/pages/Home.tsx`)
- Add a `ClarityItem` with `Smartphone` icon and "Works as an App" label to the existing strip (~line 308)

**2. Home page FAQ** (`src/pages/Home.tsx`)
- Add FAQ entry: "Can I install this as an app?" → explains offline/home screen benefits, links to `/install`

**3. Home page footer** (`src/pages/Home.tsx` ~line 585)
- Add a muted "Install as app" link below the existing logo/text, only shown when not in standalone mode

**4. Dashboard footer** (`src/pages/Dashboard.tsx` before `</main>` ~line 464)
- Add a muted footer section at the bottom with an "Install as app →" link to `/install`, only when not in standalone mode

**5. HostGame footer** (`src/pages/HostGame.tsx` ~line 234)
- Same subtle "Install as app →" muted link after `</main>` content

**6. PlayGame footer** (`src/pages/PlayGame.tsx` ~line 194)
- Same subtle link

All footer links use the same pattern:
```tsx
{!window.matchMedia('(display-mode: standalone)').matches && (
  <p className="text-center py-4">
    <Link to="/install" className="text-xs text-muted-foreground/50 hover:text-primary transition-colors font-display">
      Install as app →
    </Link>
  </p>
)}
```

### Files
- `src/pages/Home.tsx` — ClarityItem + FAQ + footer link
- `src/pages/Dashboard.tsx` — footer link
- `src/pages/HostGame.tsx` — footer link
- `src/pages/PlayGame.tsx` — footer link

