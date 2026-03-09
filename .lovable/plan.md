

## Change Crown Icons to Skull Icons + Regenerate PWA Icon

### Changes

#### 1. Replace `Crown` with `Skull` across all files

| File | Lines | Change |
|---|---|---|
| `src/pages/Home.tsx` | import + lines 39, 206, 238 | `Crown` → `Skull` (already imported) |
| `src/pages/Admin.tsx` | import + line 107 | `Crown` → `Skull` |
| `src/pages/Dashboard.tsx` | import + line 172 | `Crown` → `Skull` |
| `src/pages/HostGame.tsx` | import + line 176 | `Crown` → `Skull` |

Simple find-and-replace of the `Crown` icon with `Skull` from lucide-react in all four files.

#### 2. Regenerate PWA Icon

Update the prompt in `supabase/functions/generate-pwa-icon/index.ts` to use a skull motif instead of a golden shield with crossed swords. Something like: *"A stylized skull with a dark medieval aesthetic on a #141318 background, warm parchment and gold tones, clean and bold for mobile home screens. No text. Fantasy horror style, simple silhouette."*

Then invoke the function to generate and upload the new icons.

