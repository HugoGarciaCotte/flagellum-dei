

## Increase Subfeat Slot Limit from 3 to 4

Simple change across AI prompts and one schema description to allow up to 4 subfeat slots instead of 3.

### Files to Change

1. **`supabase/functions/import-wiki-feats/index.ts`**
   - Line 112: Change "up to 3 slots per feat" → "up to 4 slots per feat"
   - Line 160: Change `"Slot number 1-3"` → `"Slot number 1-4"`

2. **`supabase/functions/regenerate-description/index.ts`**
   - Line 65: Change "up to 3 slots per feat" → "up to 4 slots per feat"
   - Same slot description update if present

No UI or database changes needed — the UI already renders slots dynamically from the `subfeats` JSON array, and the database column is `jsonb` with no constraint on array length.

