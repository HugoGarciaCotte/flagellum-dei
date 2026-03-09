

## Fix: Remove black margins around feat selection in Character Creation Wizard

The screenshot shows large empty margins around the feat list in the fullscreen character creation dialog. Two causes:

1. **`renderFeatList`** (line 425) applies `max-h-[50vh]` — this caps the list at half the viewport height, leaving dead space below.
2. **The wrapper** `container max-w-2xl` (line 227 in Dashboard, line 290 in PlayGame) constrains width, but that's intentional for readability — the vertical gap is the real problem.

### Changes

**`src/components/CharacterCreationWizard.tsx`** (line 425):
- Change `max-h-[50vh]` to `max-h-[60vh]` or remove the max-height entirely and let the parent `ScrollArea` handle scrolling. Removing it is cleaner since the dialog already has a `ScrollArea` wrapper.

Specifically: change `className="space-y-1.5 max-h-[50vh] overflow-y-auto"` to `className="space-y-1.5"` — the feat list will expand to fill available space and the parent ScrollArea handles overflow.

### Files to edit
- `src/components/CharacterCreationWizard.tsx` — line 425: remove `max-h-[50vh] overflow-y-auto` from `renderFeatList`

