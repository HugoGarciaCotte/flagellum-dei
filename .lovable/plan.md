

## Widen Admin Panel & Add Parseable Field Icons

### 1. Widen the admin layout
**`src/pages/Admin.tsx`** — Change `max-w-2xl` to `max-w-5xl` on line 115.

### 2. Add icons for parseable field indicators
**`src/components/ManageFeats.tsx`** — In the collapsed feat row (lines 397-402), add icons next to the existing "Subfeats" and "Specialities" indicators, plus a new indicator for `unlocks_categories`:

- **Subfeats** → `Layers` icon (already imported)
- **Specialities** → `Sparkles` icon (already imported)  
- **Unlocks** → `Lock` or `Unlock` icon (import from lucide-react)

Update the `StatusIcon` helper (~line 247) to accept an optional icon prop, then pass the appropriate icon for each field. Add an unlocks check using `(f as any).unlocks_categories?.length > 0`.

No icon for description/one-liner since every feat has that.

### Files changed
- `src/pages/Admin.tsx` — one class change
- `src/components/ManageFeats.tsx` — update StatusIcon, add unlocks indicator, import `Unlock` icon

