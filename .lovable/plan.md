

## Plan: Extract hardcoded strings to i18n

### Inventory of hardcoded user-facing strings

Organized by file, with proposed translation keys:

#### `src/pages/NotFound.tsx` (3 strings)
- `"The path is lost to darkness"` → `notFound.title`
- `"The page you seek has been consumed by shadow."` → `notFound.description`
- `"Return to the Light"` → `notFound.returnHome`

#### `src/pages/ResetPassword.tsx` (10 strings)
- `"No recovery session found. Please use the reset link from your email."` → `reset.noSession`
- `"Return to Login"` → `reset.returnToLogin`
- `"Forge New Password"` → `reset.title`
- `"Seal your oath anew"` → `reset.subtitle`
- `"Set New Password"` → `reset.setNew`
- `"New Password"` (placeholder) → `reset.newPassword`
- `"Confirm New Password"` (placeholder) → `reset.confirmPassword`
- `"Forging..."` / `"Reforge Password"` → `reset.forging` / `reset.reforge`
- Toast strings: `"Passwords don't match"`, `"Please ensure both passwords are identical."`, `"Password too short"`, `"Use at least 6 characters."`, `"Reset failed"`, `"Password updated"`, `"Your password has been forged anew."` → `reset.toast.*`

#### `src/pages/AdminFeats.tsx` + `AdminScenarios.tsx` (2 strings each, shared with Admin)
- `"Access denied."` → already exists as `admin.accessDenied`
- `"Return Home"` → already exists as `admin.returnHome`
- `"Feat Editor"` (title prop) → already exists as `admin.feats`
- `"Scenario Manager"` (title prop) → already exists as `admin.scenarios`

#### `src/pages/AdminTranslations.tsx` (title prop)
- `"Translations"` → already exists as `admin.translations`
- Toast strings (admin-internal, low priority — skip for now)

#### `src/pages/HostGame.tsx`
- `"Lv. {n}"` → `game.level`
- `"Game Master"` (userName prop to DiceRoller) — technical, skip

#### `src/components/CharacterCreationWizard.tsx` (~20 strings)
- `"Create Your Character"` → `wizard.welcome.title`
- `"Every hero begins with a calling..."` → `wizard.welcome.desc`
- `"Begin"` → `wizard.welcome.begin`
- `"Choose Your Archetype"` → `wizard.archetype.title`
- `"Your archetype defines who you are..."` → `wizard.archetype.desc`
- Step config titles/subtitles (Faith, Main Feat, Sub-Specialty, etc.) → `wizard.step.faith.title`, `.choiceDesc`, `.fixedDesc`, etc.
- `"No Faith"` / `"None"` → `wizard.step.noFaith` / `wizard.step.none`
- `"No religious devotion..."` / `"Skip this slot"` → `wizard.step.noFaithDesc` / `wizard.step.skipSlot`
- `"No special choices for your archetype."` → `wizard.step.noChoices`
- `"Continue"` → `wizard.continue`
- `"Your Character"` → `wizard.summary.title`
- `"Archetype:"` → `wizard.summary.archetype`
- Labels: `"Faith"`, `"Main Feat"`, `"Sub-Specialty"`, `"Feat"` → `wizard.summary.faith`, etc.
- `"Upload"` / `"Generate"` → `wizard.portrait.upload` / `wizard.portrait.generate`
- `"Portrait features available when online"` → `wizard.portrait.offlineNote`
- `"Description"` label → `wizard.description`
- `"Regenerate"` → `wizard.regenerate`
- `"Crafting your legend..."` → `wizard.craftingLegend`
- `"An epic description of your character..."` (placeholder) → `wizard.descPlaceholder`
- `"Name"` label → `wizard.name`
- `"Random Name"` → `wizard.randomName`
- `"Character name"` (placeholder) → `wizard.namePlaceholder`
- `"Finish Character"` → `wizard.finish`
- Toast strings → `wizard.toast.*`
- `"Search..."` (placeholder) → `wizard.search`

#### `src/components/CharacterSheet.tsx` (~8 strings)
- `"Loading character..."` → `character.loading`
- `"Upload"` / `"Generate"` → reuse `wizard.portrait.upload` / `wizard.portrait.generate`
- `"Portrait features available when online"` → reuse `wizard.portrait.offlineNote`
- `"Character name"` (placeholder) → reuse `wizard.namePlaceholder`
- `"Description (optional)"` (placeholder) → `character.descPlaceholder`
- `"Save Changes"` → `character.saveChanges`
- `"Done"` → `character.done`
- Toast strings → `character.toast.*`

#### `src/components/CharacterFeatPicker.tsx`
- `"Search feats..."` (placeholder) → `feats.search`

#### `src/components/DiceRoller.tsx` (3 strings)
- `"🎲 The Game Master rolled a dice"` → `dice.gmRolled`
- `"🎲 {name} rolled a {n}"` → `dice.playerRolled`
- `"You rolled a {n}!"` → `dice.youRolled`

#### `src/components/GameTimer.tsx` (1 string)
- `"min"` → `timer.min` (minor, but translatable)

#### Admin-only components (FeatEditorPanel, SubfeatSlotEditor, ManageRedirects, ManageFeats, ImportFeatsCard, ScenarioEditorPanel)
- These are admin-internal tools. **Skip** — low value, admin-only, English is fine.

---

### Implementation

**Files changed:**
- `src/i18n/en.ts` — add ~60 new keys
- `src/pages/NotFound.tsx` — wrap 3 strings with `t()`
- `src/pages/ResetPassword.tsx` — wrap ~10 strings + toast strings with `t()`
- `src/pages/AdminFeats.tsx` — use existing `admin.*` keys for title/access denied
- `src/pages/AdminScenarios.tsx` — same
- `src/pages/AdminTranslations.tsx` — use existing key for title
- `src/pages/HostGame.tsx` — wrap `"Lv."` string
- `src/components/CharacterCreationWizard.tsx` — wrap ~20 strings
- `src/components/CharacterSheet.tsx` — wrap ~8 strings
- `src/components/CharacterFeatPicker.tsx` — wrap 1 placeholder
- `src/components/DiceRoller.tsx` — wrap 3 strings
- `src/components/GameTimer.tsx` — wrap 1 string

Each file will import `useTranslation` (if not already) and replace hardcoded strings with `t("key")` calls. For components that aren't React hooks-compatible (like toast calls in callbacks), `t()` will be called at render time and passed down or called inline since `useTranslation` is already a hook used at the top level.

