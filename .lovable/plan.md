

## Hardcoded Step Titles and Subtitles for Wizard Subfeat Steps

### Problem
All three subfeat steps show the same generic title/subtitle. Each step has a distinct purpose that should be communicated clearly.

### Change: `src/components/CharacterCreationWizard.tsx`

Replace the dynamic `slotLabel` derivation (lines 524-533) and the generic subtitle text (lines 550-551, 566-567) with hardcoded per-step content based on the step's **slot index** (0, 1, 2):

**Step titles and subtitles by slot index:**

| Slot Index | Title | Subtitle (chooseable) | Subtitle (fixed) |
|---|---|---|---|
| 0 (step 2) | "Choose Your Faith" | "Faith is a major roleplay choice — but it can save your life once. Choose wisely:" | "Your archetype grants you this faith by default:" |
| 1 (step 3) | "Archetype Ability" | "This is the main ability granted by your archetype:" | "Your archetype grants you this ability by default:" |
| 2 (step 4) | "Sub-Specialty" | "Pick a sub-specialty to further define your character:" | "Your archetype grants you this sub-specialty by default:" |

**Implementation** — replace the `slotLabel` block and subtitle strings in `renderSubfeatStep`:

```typescript
const slotIndex = stepNum - 2; // step 2 = slot 0, step 3 = slot 1, step 4 = slot 2

const stepConfig = [
  {
    title: "Choose Your Faith",
    subtitleChoice: "Faith is a major roleplay choice — but it can save your life once. Choose wisely:",
    subtitleFixed: "Your archetype grants you this faith by default:",
  },
  {
    title: "Archetype Ability",
    subtitleChoice: "This is the main ability granted by your archetype:",
    subtitleFixed: "Your archetype grants you this ability by default:",
  },
  {
    title: "Sub-Specialty",
    subtitleChoice: "Pick a sub-specialty to further define your character:",
    subtitleFixed: "Your archetype grants you this sub-specialty by default:",
  },
][slotIndex] ?? { title: "Choose an Ability", subtitleChoice: "Choose one:", subtitleFixed: "Granted by default:" };
```

Then use `stepConfig.title` in the `<h3>` (line 543), `stepConfig.subtitleFixed` in the fixed branch (line 551), and `stepConfig.subtitleChoice` in the list branch (line 567).

**Single file change:** `src/components/CharacterCreationWizard.tsx`

