

## Rename "Prima TRPG" → "Flagellum Dei TTRPG" Across the Entire Project

Global find-and-replace of all branding references. Note: the wiki API URLs (`prima.wiki`) are infrastructure endpoints and should NOT be renamed — only user-facing text changes.

### Files to update

#### 1. `index.html`
- `<title>` → "Flagellum Dei TTRPG Helper"
- `meta[name=description]` → replace "TRPG" with "TTRPG"
- `meta[name=author]` → "Flagellum Dei TTRPG Helper"
- `meta[name=apple-mobile-web-app-title]` → "Flagellum Dei TTRPG Helper"
- `meta[name=twitter:site]` → "@FlagellumDei" (or remove)
- `og:title`, `twitter:title` → "Flagellum Dei TTRPG Helper"

#### 2. `src/pages/Home.tsx`
- Header brand: "Prima TRPG" → "Flagellum Dei TTRPG"
- CTA text: "world of Prima TRPG" → "world of Flagellum Dei TTRPG"
- Footer: "Prima TRPG Helper" → "Flagellum Dei TTRPG Helper"

#### 3. `src/pages/Dashboard.tsx`
- PageHeader title: "Prima TRPG Helper" → "Flagellum Dei TTRPG Helper"

#### 4. `src/pages/Auth.tsx`
- Heading: "Prima TRPG Helper" → "Flagellum Dei TTRPG Helper"

#### 5. `src/pages/Install.tsx`
- Heading: "Install Prima TRPG Helper" → "Install Flagellum Dei TTRPG Helper"
- Button: "Back to Prima TRPG Helper" → "Back to Flagellum Dei TTRPG Helper"

#### 6. `vite.config.ts`
- PWA manifest `name`: "Flagellum Dei TTRPG Helper"
- PWA manifest `short_name`: "FlagellumDei"

#### 7. `supabase/functions/generate-pwa-icon/index.ts`
- Update the prompt string: "Prima TRPG" → "Flagellum Dei TTRPG"

#### 8. Update project identity memory
- Standardize on "TTRPG" (not "TRPG") everywhere per the new name.

**Not changed**: `prima.wiki` API URLs in edge functions (those are external infrastructure, not branding).

