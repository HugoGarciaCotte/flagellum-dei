

## Update Scenario Showcase with Real Data + Clarify 9 Scenarios

### Changes to `src/pages/Home.tsx`

**1. Scenario showcase cards (Section 5):** Show real first 3 scenarios from DB:
- Chapter 1: "Danse Macabre Part 1" — Austrian abbey, ritualistic murders, pagan curse
- Chapter 2: "Danse Macabre Part 2" — Criminal syndicate in the catacombs of Provins
- Chapter 3: "Danse Macabre Part 3" — Vengeful musician, mass dancing plague in Spain

Update the showcase to display all 3 DB scenarios with their actual titles/descriptions. Keep the generated images (burned village, monastery, pilgrims) as atmospheric art for each card. Add a line below the 3 cards: "9 scenarios. A campaign spanning Europe. The vast majority took a full year of historical research."

**2. Update fallback showcaseScenarios** to match real DB content (in case DB query fails).

**3. Section 6 (Depth of Writing):** Update the blockquote from "Some scenarios take nearly a year to write" → "9 scenarios spanning Europe — the vast majority took a full year of historical research."

**4. Section 5 heading:** Add subtitle clarifying the scope: "A nine-part campaign across plague-era Europe."

### Files to edit
- `src/pages/Home.tsx`

