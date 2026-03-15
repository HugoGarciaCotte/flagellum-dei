

## Fix: Enforce minimum 16px via CSS (specificity correction)

The current CSS rule doesn't work because it sits inside `@layer base`, which Tailwind utilities override. The fix is simple — move the rule **outside** all `@layer` blocks so it has higher specificity.

### Why not edit 500+ instances manually?
- 571 uses of `text-xs` and 764 uses of `text-sm` across 54 files
- Many are in UI components (badges, buttons, selects) that should stay small
- Future code would need to remember the rule — CSS enforcement is self-maintaining

### Change — `src/index.css`

Remove the `--min-body-font` variables and `p, li, label` rule from inside `@layer base`, and place them **before** the `@layer base` block, outside any layer:

```css
/* BEFORE @layer base — higher specificity than Tailwind utilities */
:root {
  --min-body-font: 1rem;
}

[data-page="home"] {
  --min-body-font: 0px;
}

p, li, label {
  font-size: max(var(--min-body-font), inherit) !important;
}
```

The `!important` is needed because Tailwind utility classes (like `text-xs`) are generated outside layers too. This is a legitimate use — enforcing a design-system minimum on content elements only.

### One file, ~7 lines moved. No other files need changes.

