

## Progressive Save During Character Creation Wizard

### Problem
Currently the character is only saved at the very end (step 5, "Create Character" button). If the user closes or navigates away mid-wizard, all progress is lost.

### Approach
Save the character to the database progressively — create the DB record as soon as the archetype is chosen (step 1), then update it as each subsequent step completes. This way, if the user leaves at any point after step 1, they have a partial but valid character saved.

### Changes

#### `src/components/CharacterCreationWizard.tsx`

1. **Add a `characterId` state** to track the DB record once created
2. **Step 1 (Archetype selected)**: Instead of just setting local state, immediately:
   - Insert a new `characters` row with `name: "New Character"`, `user_id`
   - Insert the archetype as a level-1 `character_feats` row
   - If `gameId` is provided, update `game_players.character_id`
   - Store the returned `characterId` and `characterFeatId` in state
3. **Step 2 (Faith selected)**: Insert/update the subfeat in `character_feat_subfeats` for the faith slot
4. **Steps 3-4 (Subfeat selections)**: Same pattern — insert the subfeat row for the relevant slot
5. **Step 5 (Final)**: Update the character's `name`, `description`, and `portrait_url` on the existing record (no new insert)
6. **Skip button**: Since the character is already created after step 1, "Skip" just calls `onCreated(characterId)` without further DB writes (the partial character is already saved)
7. **Step 0 skip** (before archetype): Keep existing `handleSkip` that creates a blank character

#### Key details
- Store `characterFeatId` (the `character_feats.id` for the archetype row) so subfeats can reference it
- When going **back** to a previous step and re-selecting, delete the old subfeat row before inserting the new one (upsert pattern)
- Invalidate `my-characters` query after the initial creation in step 1
- The `onCancel` callback no longer needs special handling — the character exists in the DB already, which is the desired behavior

### DB operations per step
```text
Step 0 → Step 1:  INSERT characters + INSERT character_feats + UPDATE game_players
Step 1 → Step 2:  INSERT character_feat_subfeats (faith slot)
Step 2 → Step 3:  INSERT character_feat_subfeats (slot 2)
Step 3 → Step 4:  INSERT character_feat_subfeats (slot 3)
Step 4 → Step 5:  UPDATE characters (name, description, portrait_url)
```

