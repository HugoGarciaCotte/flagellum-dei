

## Subfeat System

### Concept
Some feats grant "subfeats" — additional feat choices that a character gets when they acquire the parent feat. Up to 3 subfeat slots per feat. Each slot is one of:
- **"fixed"** — automatically granted (e.g., Alchemist always gives Knowledge)
- **"list"** — pick from named feats (e.g., pick from [Alchemy, Herbalism, ...]), optionally skippable
- **"type"** — pick any feat matching a category filter (e.g., Foreigner: any feat that isn't Archetype or Hidden), optionally skippable

### Database Changes

**1. Add `subfeats` JSONB column to `feats` table**

Stores the subfeat definition as a JSON array on each feat:
```json
[
  { "slot": 1, "kind": "fixed", "feat_title": "Knowledge" },
  { "slot": 2, "kind": "list", "options": ["Faith"], "optional": true },
  { "slot": 3, "kind": "list", "options": ["Alchemy", "Herbalism", "Poison"], "optional": true }
]
```
Or for Foreigner:
```json
[
  { "slot": 1, "kind": "type", "filter": "not:Archetype,not:Hidden Feat", "optional": false }
]
```
Default: `null` (no subfeats).

**2. Create `character_feat_subfeats` table**

Stores which subfeat a character chose for each slot of an assigned feat:
- `id` (uuid, PK)
- `character_feat_id` (uuid, FK → character_feats.id, ON DELETE CASCADE)
- `slot` (integer, 1-3)
- `subfeat_id` (uuid, FK → feats.id)
- Unique constraint on `(character_feat_id, slot)`

RLS: same pattern as `character_feats` — users can manage their own, host can manage game players'.

### Edge Function Changes

**3. Update `import-wiki-feats` — AI extracts subfeats during import**

Add a second AI call (or extend the existing one) that uses tool calling to extract subfeat definitions. The AI prompt will explain the three kinds (fixed, list, type) and instruct the model to analyze the feat's wiki content and categories to determine if it grants subfeats.

The tool schema:
```json
{
  "name": "set_subfeats",
  "parameters": {
    "properties": {
      "subfeats": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "slot": { "type": "integer" },
            "kind": { "enum": ["fixed", "list", "type"] },
            "feat_title": { "type": "string" },
            "options": { "type": "array", "items": { "type": "string" } },
            "filter": { "type": "string" },
            "optional": { "type": "boolean" }
          }
        }
      }
    }
  }
}
```

The system prompt will include the all-feats title list so the AI can reference real feat names, and explain the Archetype pattern (Faith or not + default + list).

Save the result into the `subfeats` JSONB column during upsert.

**4. Update `regenerate-description` to also support regenerating subfeats**

Add a `regenerate_subfeats` mode that re-runs the subfeat extraction AI for a single feat.

### Frontend Changes

**5. Update `CharacterFeatPicker.tsx`**

- Fetch `subfeats` in the feats query (add to select and `Feat` type)
- Fetch `character_feat_subfeats` alongside `character_feats`
- When a feat with subfeats is assigned to a character:
  - Auto-insert "fixed" subfeats
  - Show subfeat slots indented under the parent feat in the character sheet
  - For "list" slots: show a small picker with only the listed feats (+ "None" if optional)
  - For "type" slots: show a picker filtered by category rules
- When expanding a feat in the sheet, show its subfeats indented below it
- When deleting a parent feat, cascade deletes the subfeats (handled by DB FK cascade)

**6. Update `ManageFeats.tsx`**

- Show subfeats definition in the edit dialog (read-only JSON or a simple UI showing slots)
- Add a "Regenerate Subfeats" button that calls the edge function

### Files Changed
- Migration SQL (new column + new table + RLS policies)
- `supabase/functions/import-wiki-feats/index.ts` — add subfeat extraction AI call
- `supabase/functions/regenerate-description/index.ts` — add subfeat regeneration mode
- `src/components/CharacterFeatPicker.tsx` — subfeat display + selection UI
- `src/components/ManageFeats.tsx` — show/edit subfeat definitions

