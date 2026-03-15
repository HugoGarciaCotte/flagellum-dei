

## Enforce 18px minimum font size everywhere

### Approach

Override Tailwind's font size scale so that `text-xs`, `text-sm`, and `text-base` all resolve to 18px minimum. This automatically applies to all UI components (buttons, badges, selects, labels, etc.) without touching 59+ files individually.

Then fix the handful of hardcoded small sizes (arbitrary `text-[10px]`/`text-[11px]` classes and a CSS `font-size: 0.75rem`).

### Changes

**1. `tailwind.config.ts`** — Add `fontSize` overrides in `theme.extend`:
```ts
fontSize: {
  xs:   ['18px', { lineHeight: '1.4' }],
  sm:   ['18px', { lineHeight: '1.5' }],
  base: ['18px', { lineHeight: '1.6' }],
}
```
`text-lg` (18px), `text-xl` (20px), etc. are already ≥ 18px — no change needed.

**2. `src/index.css`** — Change `font-size: 0.75rem` (12px) in the `.ornamental-divider::after` pseudo-element to `font-size: 18px`.

**3. Replace arbitrary small sizes in source files:**
- `text-[10px]` → `text-base` (in Home.tsx ×3, FeatEditorPanel.tsx ×3, ScenarioEditorPanel.tsx ×3, AdminTranslations.tsx ×1)
- `text-[11px]` → `text-base` (in Home.tsx ×1)

~5 files, mostly search-and-replace.

