

## Plan: Rename to "Prima TTRPG Helper"

Replace all brand name occurrences across 6 files:

| File | Old | New |
|---|---|---|
| `index.html` | "Prima Danse Macabre RPG Helper" (title, og:title) | "Prima TTRPG Helper" |
| `index.html` | "Prima Danse Macabre" (author, apple-title) | "Prima TTRPG Helper" |
| `index.html` | "@PrimaDanseMacabre" (twitter) | "@PrimaTTRPG" |
| `vite.config.ts` | name: "Prima Danse Macabre RPG Helper", short_name: "PrimaDanse" | name: "Prima TTRPG Helper", short_name: "PrimaTTRPG" |
| `src/pages/Home.tsx` | 4 occurrences of "Prima Danse Macabre" | "Prima TTRPG Helper" |
| `src/pages/Dashboard.tsx` | "Prima Danse Macabre" | "Prima TTRPG Helper" |
| `src/pages/Auth.tsx` | "Prima Danse Macabre" | "Prima TTRPG Helper" |
| `src/pages/Install.tsx` | "Install Prima Danse Macabre" / "Back to Prima Danse Macabre" | "Install Prima TTRPG Helper" / "Back to Prima TTRPG Helper" |

Straightforward find-and-replace across these 6 files. No logic or structural changes.

