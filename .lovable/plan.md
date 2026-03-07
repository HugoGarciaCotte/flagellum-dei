

## Plan: Rename App to "Prima Danse Macabre RPG Helper"

Replace all instances of "Quest Scroll" / "QuestScroll" across these files:

- **`index.html`** — title, meta tags (author, apple-mobile-web-app-title, og:title)
- **`vite.config.ts`** — PWA manifest `name` and `short_name`
- **`src/pages/Home.tsx`** — header, hero description, install section, footer
- **`src/pages/Dashboard.tsx`** — header title
- **`src/pages/Auth.tsx`** — login heading
- **`src/pages/Install.tsx`** — heading and back button text

All 6 files, ~15 string replacements total. No structural changes.

