

## Fix Wizard Steps: Use Archetype Subfeats Properly

### Problem
The current wizard detects only 2 subfeat slots (faith + one other), and step 4 is a "free feat" (any non-archetype feat at level 2). But archetypes actually have 3 subfeat slots: slot 1 (faith), slot 2 (class feat), slot 3 (extra feat pick). Step 4 should use subfeat slot 3, not a free-pick level 2 feat.

### New Flow
- **Step 0**: Welcome (unchanged)
- **Step 1**: Archetype pick (unchanged)
- **Step 2**: Faith — use subfeat slot 1 filter (skip if no faith slot). Unchanged logic.
- **Step 3**: Main class feat — subfeat slot 2. If fixed, just inform; if list/type, let pick. (Unchanged logic, already works this way)
- **Step 4**: Extra feat — subfeat slot 3. Same display logic as step 3 (fixed → inform, list → pick). **Replaces** the current free-feat step.
- **Step 5**: Summary — unchanged except add hint: *"The portrait is generated based on your description — feel free to include details like gender, age, nationality..."*

### Changes in `CharacterCreationWizard.tsx`

#### 1. Add `subfeat3Info` detection (after `subfeat2Info`)
- Find the remaining subfeat slot that is neither the faith slot nor the subfeat2 slot
- Add `subfeat3Options` memo (same pattern as `subfeat2Options`)
- Add `subfeat3Id` and `subfeat3Slot` state

#### 2. Remove free feat state and logic
- Remove `freeFeatId` state
- Remove `freeFeatsOptions` memo
- Remove the level 2 free feat insertion in `createCharacter` (lines 346-352)
- Remove `freeFeatId` from `generateDescription` feat names and summary display

#### 3. Replace step 4 UI
- Replace the free-feat picker with subfeat3 logic (identical pattern to step 3: fixed → inform with Continue, list → pick from list)
- Add `shouldSkipSubfeat3` skip logic (when no slot 3 exists)
- Update `goToNextStep`/`goToPrevStep` to handle step 4 skipping

#### 4. Update `createCharacter`
- Insert `subfeat3Id` into `character_feat_subfeats` alongside faith and subfeat2 subfeats
- Remove the free feat level 2 insert

#### 5. Update step 5 summary
- Replace "Extra Feat" line with subfeat3 display
- Add portrait hint text below the portrait section: *"The portrait is generated based on your description — feel free to include details like gender, age, nationality, appearance..."*

#### 6. Auto-set fixed subfeat3
- Same `useEffect` pattern as subfeat2: if subfeat3 is fixed, auto-set it

