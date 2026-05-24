## Fix
Remove `padding-bottom: 0.75rem` from all top header bars by replacing `py-3` with `pt-3`. Top padding (and `safe-top` notch offset) stays; bottom padding is removed. Height continues to be governed by `min-h-12` / content + `items-center`.

## Files
- `src/components/CharacterDetailsDialog.tsx:98` — header of details & edit dialog (`py-3` → `pt-3`)
- `src/pages/Dashboard.tsx:188` — main dashboard header (`py-3` → `pt-3`)
- `src/pages/PlayGame.tsx:307` — play screen header (`py-3` → `pt-3`)

## Out of scope (intentionally untouched)
- `AiImprovePanel.tsx` inner panel paddings — not top nav bars
- `Admin.tsx` collapsible trigger — not a header bar
- `Install.tsx` accordion triggers — not header bars

## Verification
Re-screenshot the dashboard, character details, character edit, and play screen headers to confirm no bottom padding asymmetry remains.