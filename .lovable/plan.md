

## Rename "TTRPG" → "TRPG" Across the Project

Simple find-and-replace of "TTRPG" with "TRPG" in all occurrences across these files:

### Files to Change

1. **`index.html`** — Title, meta description, author, og/twitter tags
2. **`vite.config.ts`** — PWA manifest `name` and `short_name`
3. **`src/pages/Home.tsx`** — Header, hero text, install CTA, footer
4. **`src/pages/Dashboard.tsx`** — PageHeader title
5. **`src/pages/Auth.tsx`** — Login page heading
6. **`src/pages/Install.tsx`** — Install page heading and back button text
7. **`supabase/functions/validate-feat/index.ts`** — System prompt text
8. **`supabase/functions/import-wiki-feats/index.ts`** — System prompt text
9. **`supabase/functions/import-wiki-scenarios/index.ts`** — System prompt text
10. **`supabase/functions/regenerate-description/index.ts`** — System prompt text

All instances of "TTRPG" become "TRPG". No logic changes.

