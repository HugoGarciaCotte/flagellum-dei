

## Improve Faith Step Description in Character Creation Wizard

### Current State
In `src/components/CharacterCreationWizard.tsx` (line 531), the faith step subtitle is:
> "Faith is a major roleplay choice — but it can save your life once. Choose wisely:"

And the "None" skip option (line 586-588) just says:
> "None — Skip this slot"

### Change

**File: `src/components/CharacterCreationWizard.tsx`**

1. **Update `subtitleChoice`** (line 531) to something more descriptive and informative:
   > "Having faith is a major decision. It constrains your roleplay — your character must act according to their beliefs. Playing without faith is easier and more flexible. But faith has a powerful advantage: it can save your character's life once. Choose wisely."

2. **Update the "None" skip option text** (lines 585-588) — when it's the faith step (slotIndex === 0), change the label to something like:
   - Label: **"No Faith"**
   - Description: **"Your character has no religious devotion — easier to roleplay, but no divine protection."**

### Files to edit
- `src/components/CharacterCreationWizard.tsx`

