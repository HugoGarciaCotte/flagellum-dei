

## Font size readability pass — all screens except Homepage

The app heavily uses `text-xs` (12px) and `text-sm` (14px) for body content, labels, descriptions, and interactive elements. The goal is to bump these up one step where it hurts readability, while keeping intentionally small elements (badges, tooltips, dot indicators) compact.

### General rule applied
- `text-xs` body text/descriptions/labels → `text-sm`
- `text-sm` body text/descriptions → `text-base`
- Keep `text-xs` for: category badges, tooltip internals, step dots, subfeat arrows, icon-only buttons
- Some containers may need slightly more padding to accommodate larger text

---

### 1. PageHeader (`src/components/PageHeader.tsx`)
- Title: `text-lg` → `text-xl`

### 2. Dashboard (`src/pages/Dashboard.tsx`)
- Line 167: offline warning `text-xs` → `text-sm`
- Line 190: "Create Character" header `text-sm` → `text-base`
- Line 229: "Create to start" `text-sm` → `text-base`
- Line 238: "Edit Character" header `text-sm` → `text-base`
- Line 270: role badge `text-xs` → `text-sm`
- Line 304: scenario description `text-xs` → `text-sm`
- Line 315: "No scenarios" `text-sm` → `text-base`
- Line 331: GM dialog description `text-sm` → `text-base`

### 3. Auth (`src/pages/Auth.tsx`)
- Line 120: reset description `text-sm` → `text-base`
- Line 125: "Back to login" `text-sm` → `text-base`
- Line 136: "Forgot password" `text-sm` → `text-base`
- Line 143: "or" divider `text-xs` → `text-sm`
- Line 148: guest explore `text-sm` → `text-base`
- Line 161: guest convert note `text-sm` → `text-base`

### 4. PlayGame (`src/pages/PlayGame.tsx`)
- Line 144: join code button `text-xs` → `text-sm`
- Line 149: offline badge `text-xs` → `text-sm`
- Line 158: "quest begin" text `text-sm` → `text-base`
- Line 168: install link `text-xs` → `text-sm`
- Line 187: "Select character" `text-sm` → `text-base`
- Line 198: "Your Characters" header `text-sm` → `text-base`
- Line 206: "No characters yet" `text-sm` → `text-base`
- Line 245: "Create Character" header `text-sm` → `text-base`
- Line 259: "Edit Character" header `text-sm` → `text-base`

### 5. HostGame (`src/pages/HostGame.tsx`)
- Line 131: level badge `text-xs` → `text-sm`
- Line 133: offline badge `text-xs` → `text-sm`
- Line 169: install link `text-xs` → `text-sm`

### 6. CharacterListItem (`src/components/CharacterListItem.tsx`)
- Line 37: avatar fallback `text-xs` → `text-sm`
- Line 44: description `text-sm` → `text-base`
- Line 49: feat list `text-sm` → `text-base`

### 7. CharacterSheet (`src/components/CharacterSheet.tsx`)
- Line 109: loading text `text-sm` → `text-base`
- Line 158: offline note `text-xs` → `text-sm`

### 8. FeatListItem (`src/components/FeatListItem.tsx`)
- Line 74: feat title `text-sm` → `text-base`
- Line 89: description `text-xs` → `text-sm`
- Line 98: speciality select trigger `text-xs` → `text-sm`, height `h-6` → `h-7`
- Line 111: speciality read-only text `text-xs` → `text-sm`

### 9. CharacterFeatPicker (`src/components/CharacterFeatPicker.tsx`)
- Line 389: subfeat arrow `text-xs` — keep (intentionally compact)
- Line 423: empty subfeat slot text `text-xs` → `text-sm`
- Line 438: add subfeat text `text-xs` — keep (icon button)
- Line 470: picker title `text-sm` → `text-base`
- Line 509: validating text `text-sm` → `text-base`
- Line 513: "No feats found" `text-sm` → `text-base`
- Line 538: "Per level" label `text-sm` → `text-base`
- Line 549: level badge `text-xs` — keep (badge in circle)
- Line 579: "Choose feat" button `text-xs` → `text-sm`
- Line 591: "Free feats" label `text-sm` → `text-base`
- Line 596: "No free feats" `text-xs` → `text-sm`
- Line 625: "Add free" button `text-xs` → `text-sm`

### 10. WikiSectionTree (`src/components/WikiSectionTree.tsx`)
- Line 24-25: TITLE_SIZES level 5 `text-sm` → `text-base`, level 6 `text-xs` → `text-sm`
- Line 92: collapsed pill `text-xs` → `text-sm`
- Line 187: section content `text-sm` → `text-base`, also prose-sm → prose-base
- Tooltip internals: keep `text-xs` (tooltips should be compact)

### 11. GameTimer (`src/components/GameTimer.tsx`)
- Line 92: collapsed pill `text-xs` → `text-sm`
- Line 119: timer label `text-xs` → `text-sm`
- Line 124: close button `text-xs` → `text-sm`
- Lines 163, 166: ambiance table cells `text-xs` → `text-sm`

### 12. PlayerListSheet (`src/components/PlayerListSheet.tsx`)
- Line 46: trigger button `text-sm` → `text-base`
- Line 59: "No players" `text-sm` → `text-base`
- Line 71: player name `text-xs` → `text-sm`
- Line 74: "No characters" `text-xs` → `text-sm`
- Line 95: "No character selected" `text-xs` → `text-sm`
- Line 100: other chars trigger `text-xs` → `text-sm`

### 13. GMPlayerList (`src/components/GMPlayerList.tsx`)
- Line 76: player name `text-xs` → `text-sm`
- Line 87: "No character selected" `text-xs` → `text-sm`

### 14. Install page (`src/pages/Install.tsx`)
- Lines 50, 53, 56: feature descriptions `text-xs` → `text-sm`
- Line 89: Safari note `text-xs` → `text-sm`
- Line 115: Chrome desktop note `text-xs` → `text-sm`

### 15. Admin page (`src/pages/Admin.tsx`)
- Line 74: legacy trigger `text-sm` → `text-base`

### 16. CharacterCreationWizard (`src/components/CharacterCreationWizard.tsx`)
- Line 380: "No feats found" `text-sm` → `text-base`
- Lines 510, 526, 549, 597: step descriptions `text-sm` → `text-base`
- Line 534-535: "No faith" option name `text-sm` → `text-base`, desc `text-xs` → `text-sm`
- Line 566: welcome desc `text-sm` → `text-base`
- Line 647: summary text `text-sm` → `text-base`
- Line 684: offline portrait note `text-xs` → `text-sm`
- Line 692, 721: labels `text-sm` → `text-base`
- Line 696, 725: regenerate/random buttons `text-xs` → `text-sm`
- Line 707: crafting text `text-sm` → `text-base`

### 17. GuestBanner (`src/components/GuestBanner.tsx`)
- Line 15: `text-sm` → `text-base`

### 18. ResetPassword (`src/pages/ResetPassword.tsx`)
- Already uses appropriate sizes, no changes needed.

### 19. FullPageLoader (`src/components/FullPageLoader.tsx`)
- Already uses `text-xl`, no changes needed.

---

### Summary

~17 files modified, each with simple Tailwind class swaps. No global CSS changes. Homepage (`Index.tsx`) excluded. Tooltips and category badges stay small by design.

