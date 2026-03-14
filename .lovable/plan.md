

## Plan: Import scenario export ZIP

### What

Copy the 3 images from the ZIP into `public/scenario-backgrounds/` (preserving subfolder structure) and replace `src/data/scenarios.ts` with the exported version containing local paths.

### Steps

1. **Copy images** from the ZIP to `public/`:
   - `public/scenario-backgrounds/f0/PMa_ANG036_F_Angers.jpg`
   - `public/scenario-backgrounds/b830f194-9f41-4632-b628-9bae1e552780/1773505346311.jpg`
   - `public/scenario-backgrounds/08/Collegiale_Saint-Quiriace_Provins_sud.jpg`

2. **Replace `src/data/scenarios.ts`** with the exported file from the ZIP. Key differences from current version:
   - `scenario1.title` changed to "Danse Macabre Chapter 1"
   - Scenarios 1-9 now have full wikitext `content` fields (previously `null`)
   - Content uses local paths like `/scenario-backgrounds/b830f194.../1773505346311.jpg` instead of Supabase storage URLs
   - Generated timestamp updated to `2026-03-14T16:44:54.626Z`

### Files changed
- `public/scenario-backgrounds/` — 3 new image files in subdirectories
- `src/data/scenarios.ts` — replaced with exported version

