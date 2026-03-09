

## New Character Creation Wizard

Replace the current `CreateCharacterForm` (simple name+description form) with a multi-step wizard that guides players through character creation with AI-generated descriptions, names, and portraits.

### Wizard Flow (4 steps)

**Every step has a "Skip" button → creates a blank character named "Blank" and exits.**

1. **Step 1 — Welcome / Archetype Pick**: Encouraging text, then show the feat list filtered to Archetypes only. Player picks one → this becomes their level 1 feat.

2. **Step 2 — Faith Choice**: Parse the selected archetype's metadata to check if it has a subfeat slot that allows "Faith" or "Dark Faith" category feats. Show three options: None, Faith, (and Dark Faith if allowed). If the archetype doesn't allow faith at all, skip this step automatically. If picked, this becomes a subfeat of the archetype.

3. **Step 3 — Default Feat / Subfeat**: Check the archetype's `feat_subfeat:2` metadata. If it's `fixed`, show "Your archetype grants you [feat name]" as info. If it's `list` or `type`, let the user pick from the filtered list. This sets subfeat slot 2 on the archetype's character_feat.

4. **Step 4 — Free Feat Pick**: "For extra customisation, pick a feat." Show the standard feat list (excluding Archetypes, Hidden). This becomes the character's level 2 feat or a free feat.

5. **Step 5 — Summary & Name**: 
   - AI generates an epic one-sentence description based on archetype + faith + feats chosen (edge function call to Lovable AI).
   - Player can edit the generated description.
   - Name input with "Random Name" button (AI generates a 1340s European name via the same edge function).
   - "Generate Portrait" button (uses existing `generate-character-portrait` edge function) and upload button.
   - "Create Character" finalizes everything.

### New Files

#### `src/components/CharacterCreationWizard.tsx`
The main wizard component. Props: `onCreated: (characterId: string) => void`, `onCancel?: () => void`, `gameId?: string` (if creating inside a game, to also set `character_id` on `game_players`).

Internal state: `step` (0-4), `archetypeId`, `faithFeatId`, `subfeat2Id`, `freeFeatId`, `name`, `description`, `portraitUrl`.

Uses the same feat-fetching queries as CharacterFeatPicker. Reuses `FeatListItem` for displaying feats in each step's list.

On final submit:
1. Insert character (name, description, portrait_url)
2. Insert character_feat level 1 = archetype
3. Insert character_feat_subfeats for faith (slot depends on archetype metadata) and subfeat2
4. Insert character_feat level 2 = free feat (if picked)
5. If `gameId`, update `game_players.character_id`

#### `supabase/functions/generate-character-details/index.ts`
New edge function handling two modes via a `type` field:
- `type: "description"` — Takes archetype name, faith choice, feat names → returns an epic one-sentence description.
- `type: "name"` — Takes description, archetype → returns a realistic European name circa 1340.

Uses `google/gemini-3-flash-preview`. Auth validated in code.

### Modified Files

#### `src/pages/Dashboard.tsx`
Replace `CreateCharacterForm` inside the dialog with `CharacterCreationWizard`. On `onCreated`, close dialog and open CharacterSheet as before.

#### `src/pages/PlayGame.tsx`
Replace `CreateCharacterForm` with `CharacterCreationWizard`, passing `gameId` so the wizard can auto-select the character for the game.

#### `src/components/CreateCharacterForm.tsx`
Keep as-is for any simple use cases, but Dashboard and PlayGame will use the wizard instead.

### Key Implementation Details

- **Faith detection**: Parse archetype's metadata subfeats. Look for a slot with `filter` containing "Faith" category. If found, offer Faith. If filter also doesn't exclude "Dark Faith" or includes "Dark Feat", offer Dark Faith too.
- **Subfeat slot 2 detection**: Read `metaMap.get(archetypeId).subfeats` for slot 2. Branch on `kind`: fixed → show info, list → show options, type → filter feats.
- **AI calls are non-blocking**: Description and name generation show loading spinners but don't block navigation.
- **Portrait uses the existing edge function** `generate-character-portrait` — called after the character is created.

### No database changes needed
All data fits existing tables: `characters`, `character_feats`, `character_feat_subfeats`.

