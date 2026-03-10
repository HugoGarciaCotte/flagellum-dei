

## Replace Lucide icons with alchemical symbols

Replace specific Lucide icon components with inline `<span>` elements containing alchemical Unicode characters across 6 files.

### Mapping

| File | Lucide Icon | Alchemical | Symbol |
|------|------------|------------|--------|
| `Auth.tsx` | `Sword` | 🝉 | Login tab |
| `ResetPassword.tsx` | `Shield` | 🝒 | Header icon |
| `ResetPassword.tsx` | `KeyRound` | 🜐 | Key icon (2 locations) |
| `Dashboard.tsx` | `DoorOpen` | 🜊 | Join a Game |
| `Dashboard.tsx` | `Scroll` | 🜾 | Host a Game |
| `Dashboard.tsx` | `Users` | 🜊 | Active Games |
| `Dashboard.tsx` | `Sword` | 🝖 | My Characters (2 locations) |
| `Dashboard.tsx` | `ShieldCheck` | 🜁 | Become GM (3 locations) |
| `PlayGame.tsx` | `Scroll` | 🜣 | Page header icon |
| `HostGame.tsx` | `StopCircle` | 🝎 | End button |
| `CharacterFeatPicker.tsx` | `Gift` | 🜅 | Free Feats |
| `CharacterFeatPicker.tsx` | `ShieldAlert` | 🝍 | Validation warning |
| `PlayerListSheet.tsx` | `Users` | 🜊 | Trigger + header (2 locations) |

### Approach per file

Each `<IconComponent className="h-X w-X ..." />` becomes `<span className="text-[size] ..." aria-hidden="true">SYMBOL</span>`, matching the sizing via Tailwind `text-*` classes (e.g. `h-4 w-4` → `text-base`, `h-5 w-5` → `text-lg`, `h-6 w-6` → `text-xl`, `h-8 w-8` → `text-2xl`, `h-12 w-12` → `text-4xl`). Color classes carry over.

Unused Lucide imports will be removed from each file's import statement.

### Files changed

1. **`src/pages/Auth.tsx`** — Remove `Sword` import; replace 1 JSX usage with 🝉
2. **`src/pages/ResetPassword.tsx`** — Remove `Shield, KeyRound` imports; replace 3 JSX usages with 🝒 and 🜐
3. **`src/pages/Dashboard.tsx`** — Remove `DoorOpen, Scroll, Users, Sword, ShieldCheck` from import; replace ~8 JSX usages
4. **`src/pages/PlayGame.tsx`** — Remove `Scroll` from import; replace 1 JSX usage with 🜣
5. **`src/pages/HostGame.tsx`** — Remove `StopCircle` from import; replace 1 JSX usage with 🝎
6. **`src/components/CharacterFeatPicker.tsx`** — Remove `Gift, ShieldAlert` from import; replace 2 JSX usages with 🜅 and 🝍
7. **`src/components/PlayerListSheet.tsx`** — Remove `Users` from import; replace 2 JSX usages with 🜊

