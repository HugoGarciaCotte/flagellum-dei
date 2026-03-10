

## Apply Landing Page Theme Across the Whole App

The landing page has a refined dark medieval horror aesthetic — gold accents, ornamental dividers, `aged-border`, `gold-glow-box` effects, and atmospheric typography. The inner app pages already use the correct fonts and color variables but lack these atmospheric details. Here is the plan to bring consistency.

---

### 1. NotFound page — Full restyle
**File:** `src/pages/NotFound.tsx`
- Replace `bg-muted` with `bg-background`
- Add `font-display` to heading, thematic copy ("The path is lost to darkness"), gold accent on the 404 number, and an ornamental divider

### 2. Auth page — Add atmosphere
**File:** `src/pages/Auth.tsx`
- Add a subtle radial gold glow background (same pattern as landing section 3)
- Replace generic subtitle "Your adventure awaits" with something darker: "The Inquisition awaits"
- Add `aged-border` class to the card
- Add ornamental divider between logo and card

### 3. ResetPassword page — Match Auth style
**File:** `src/pages/ResetPassword.tsx`
- Add radial gold glow background
- Add `aged-border` to the card
- Update subtitle from "Reforge your enchantment" to something more thematic: "Seal your oath anew"

### 4. Install page — Match Auth style
**File:** `src/pages/Install.tsx`
- Add radial gold glow background
- Add `aged-border` to the card

### 5. Dashboard — Add atmospheric details
**File:** `src/pages/Dashboard.tsx`
- Add `aged-border` to scenario host cards and active game cards
- Add `gold-glow-box` hover effect to active game cards
- Add ornamental divider between sections
- Add subtle radial glow at top of page (like landing)

### 6. PlayGame — Add atmospheric details
**File:** `src/pages/PlayGame.tsx`
- Add `aged-border` to the quest content card
- Add `gold-glow-box` to the bottom character peek bar on hover
- Style the "Waiting for Game Master" state with an ornamental divider

### 7. HostGame — Add atmospheric details
**File:** `src/pages/HostGame.tsx`
- Add `aged-border` to the scenario content card
- Add `gold-glow-box` hover effect

### 8. PageHeader — Add subtle gold border
**File:** `src/components/PageHeader.tsx`
- Change `border-border/50` to `border-primary/10` to match the landing page header's gold-tinted border

### 9. FullPageLoader — Add atmosphere
**File:** `src/components/FullPageLoader.tsx`
- Add ornamental divider below the loading text
- Add subtle radial glow background

### 10. CharacterListItem — Gold hover
**File:** `src/components/CharacterListItem.tsx`
- Add `gold-glow-box` class for hover effect (already has `hover:border-primary/40`)

---

### What stays unchanged
- CSS variables, fonts, Tailwind config — already correct
- UI primitives (Button, Card, Input, etc.) — already themed
- Landing page — already perfect

### Summary
~10 files touched, mostly adding 1-3 CSS classes per component (`aged-border`, `gold-glow-box`, `ornamental-divider`) and updating a few text strings. No structural or logic changes.

