

## No Changes Needed

All 4 edge functions are actively used in the codebase. No unused edge functions exist.

| Function | Used In | Purpose |
|----------|---------|---------|
| `generate-character-details` | `CharacterCreationWizard.tsx` | AI name & description generation |
| `generate-character-portrait` | `CharacterSheet.tsx` | Generate + upload + save portrait for existing character |
| `generate-portrait-preview` | `CharacterCreationWizard.tsx` | Generate temporary preview portrait during creation (no storage) |
| `validate-feat` | `CharacterFeatPicker.tsx` | AI feat validation |

### Portrait preview vs portrait — the difference

- **`generate-portrait-preview`**: No auth needed, no storage. Returns a base64 data URL for a temporary preview shown during the creation wizard before the character exists in the DB.
- **`generate-character-portrait`**: Requires auth. Loads the character from DB, generates the image, uploads to `character-portraits` storage bucket, updates `portrait_url` on the character row.

### Only actionable item

The **`app-assets`** storage bucket is unused and can be deleted from the Cloud storage UI — no code references it.

