

## Remove "Helper" from Project Name

Simple global rename: **"Flagellum Dei TTRPG Helper"** → **"Flagellum Dei TTRPG"** across 6 files.

### Files and lines to update

1. **`index.html`** — title, meta author, apple-mobile-web-app-title, og:title, twitter:title
2. **`src/pages/Auth.tsx`** — heading text (line 71)
3. **`src/pages/Install.tsx`** — heading (line 44), back button (line 75)
4. **`src/pages/Home.tsx`** — footer text (line 235)
5. **`src/pages/Dashboard.tsx`** — PageHeader title (line 171)
6. **`vite.config.ts`** — PWA manifest `name` (line 76)

All instances are a straight string replace of `"Flagellum Dei TTRPG Helper"` → `"Flagellum Dei TTRPG"`.

