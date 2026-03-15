

## Remaining `text-xs` cleanup — missed files

You're right, several files still use `text-xs` that were missed in the first pass. Here's what remains (excluding Homepage, UI primitives, and tooltips/badges which should stay small):

### Files to update

**1. FeatDetailsDisplay** (`src/components/FeatDetailsDisplay.tsx`)
- Lines 39-40: tooltip description `text-xs` → `text-sm`
- Lines 45-46: tooltip prerequisites `text-xs` → `text-sm`
- Lines 51-52: tooltip blocking `text-xs` → `text-sm`
- Lines 57-58: tooltip special `text-xs` → `text-sm`
- Lines 147-148: prerequisites section `text-xs` → `text-sm`
- Lines 155-156: blocking section `text-xs` → `text-sm`
- Line 171: prose content `text-xs prose-xs` → `text-sm prose-sm`

**2. WikiLinkedText** (`src/components/WikiLinkedText.tsx`)
- Line 69: "Feat not found" `text-xs` → `text-sm`
- Line 78: description `text-xs` → `text-sm`
- Lines 82-83: prerequisites `text-xs` → `text-sm`
- Lines 88-89: blocking `text-xs` → `text-sm`
- Lines 94-95: special `text-xs` → `text-sm`

**3. ManageFeats** (`src/components/ManageFeats.tsx`)
- Line 73: description `text-xs` → `text-sm`
- Lines 76-78: prerequisites `text-xs` → `text-sm`
- Lines 81-83: blocking `text-xs` → `text-sm`
- Line 87: "Raw content" summary `text-xs` → `text-sm`
- Line 88: raw content pre `text-xs` → `text-sm`

**4. CharacterCreationWizard** (`src/components/CharacterCreationWizard.tsx`)
- Lines 696, 725: regenerate/random buttons `text-xs` → `text-sm` (missed in first pass)

**5. CharacterFeatPicker** (`src/components/CharacterFeatPicker.tsx`)
- Line 389: subfeat arrow — keep `text-xs` (intentional)
- Line 438: add subfeat — keep `text-xs` (icon button)
- Line 549: level badge circle — keep `text-xs` (badge)

**6. AdminTranslations** (`src/pages/AdminTranslations.tsx`)
- Line 244: audit prompt desc `text-xs` → `text-sm`
- Line 245: audit prompt pre `text-xs` → `text-sm`
- Line 297: key code `text-xs` → `text-sm`

**7. BackgroundInsertDialog** (`src/components/BackgroundInsertDialog.tsx`)
- Lines 141, 144, 147: toggle group items `text-xs` → `text-sm`
- Line 215: ref image label `text-xs` → `text-sm`
- Line 241: remove ref button `text-xs` → `text-sm`

**8. ScenarioEditorPanel** (`src/components/ScenarioEditorPanel.tsx`)
- Line 455: content label `text-xs` → `text-sm`
- Line 476: toolbar button `text-xs` → `text-sm`
- Line 521: textarea `text-xs` → `text-sm`
- Line 571: override field label `text-xs` → `text-sm`

**9. SubfeatSlotEditor** (`src/components/SubfeatSlotEditor.tsx`)
- Lines 21, 29, 31, 49, 56, 58, 68, 70, 80, 82: all labels and inputs `text-xs` → `text-sm`

**10. LanguagePicker** (`src/components/LanguagePicker.tsx`)
- Line 38: button text `text-xs` → `text-sm`

### What stays `text-xs`
- Category badges (`FeatCategoryBadges`) — intentionally compact
- Badge counts in headers (e.g. "42 feats", "Lvl 3")
- Subfeat arrow indicators (`↳`)
- Level circle badges in feat picker
- `text-[10px]` badges (e.g. "Modified", "Missing") — even smaller by design

### Summary
~10 additional files, same pattern: swap `text-xs` → `text-sm` for readable content. Admin-only screens (ScenarioEditor, SubfeatSlot, AdminTranslations) are included since readability matters there too.

