

## Plan: Light Parchment Theme

Change the color scheme from dark mode to a light parchment background with dark text. Update CSS variables in `src/index.css`.

### Color Variable Changes (`src/index.css` `:root`)

| Variable | Current (dark) | New (parchment) |
|---|---|---|
| `--background` | `240 12% 8%` | `39 30% 92%` |
| `--foreground` | `45 20% 90%` | `240 10% 12%` |
| `--card` | `240 10% 12%` | `39 25% 88%` |
| `--card-foreground` | `45 20% 90%` | `240 10% 12%` |
| `--popover` | `240 10% 14%` | `39 25% 90%` |
| `--popover-foreground` | `45 20% 90%` | `240 10% 12%` |
| `--primary` | keep gold `35 80% 50%` | `35 80% 38%` (darker gold for contrast on light bg) |
| `--primary-foreground` | `240 12% 8%` | `39 30% 95%` |
| `--secondary` | `240 8% 18%` | `39 20% 82%` |
| `--secondary-foreground` | `45 15% 80%` | `240 10% 20%` |
| `--muted` | `240 8% 16%` | `39 15% 85%` |
| `--muted-foreground` | `240 5% 55%` | `240 5% 45%` |
| `--accent` | keep mystic | `280 30% 55%` (lighter for light bg) |
| `--accent-foreground` | `45 20% 95%` | `240 10% 10%` |
| `--border` | `240 8% 20%` | `35 20% 78%` |
| `--input` | `240 8% 20%` | `35 20% 78%` |
| `--ring` | keep | keep |
| `--sidebar-*` | dark variants | matching light parchment variants |
| `--parchment` | `40 30% 85%` | `39 30% 92%` |

Also update `index.html` `theme-color` meta tag from `#141318` to a parchment tone like `#ebe2d0`.

### Files to modify
- `src/index.css` — all CSS variables
- `index.html` — theme-color meta tag

