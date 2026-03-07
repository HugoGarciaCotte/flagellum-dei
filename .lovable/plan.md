

## Show Full Descriptions + Regenerate in Admin Panel

### Current State
- The table rows truncate descriptions to `max-w-[200px]` with `truncate` class
- Descriptions are AI-generated during import but can only be edited by opening the full edit dialog
- No way to regenerate a description without re-importing

### Changes

**1. New edge function: `supabase/functions/regenerate-description/index.ts`**
- Accepts `{ type: "feat" | "scenario", id: string }`
- Auth-gated to owner role (same pattern as import functions)
- Fetches the item's title, content, and categories (for feats) from the database
- Calls the same AI generation logic used during import
- Updates the description in the database and returns it

**2. Update `ManageScenarios.tsx`**
- Show full description (not truncated) in the table — remove `truncate max-w-[200px]`, use a smaller text with word wrapping instead
- Add a "Regenerate" button (sparkle/wand icon) next to each scenario's description that calls the new edge function and refreshes the list
- The existing edit dialog already has a description textarea, so hand-editing is already supported

**3. Update `ManageFeats.tsx`**
- Same changes: show full description, add regenerate button
- The existing edit dialog already supports editing description by hand

### Files changed
- `supabase/functions/regenerate-description/index.ts` — new edge function for AI regeneration
- `src/components/ManageScenarios.tsx` — show full description, add regenerate button
- `src/components/ManageFeats.tsx` — show full description, add regenerate button

