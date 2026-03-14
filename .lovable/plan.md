

## Plan: AI generation for feat metadata

### Concept
Add AI-powered generation to the feat editor, both **bulk** (generate a specific field for all feats that are missing it) and **per-feat** (generate a single field or all fields for one feat). Mirrors the translation "Generate All" pattern.

### 1. New edge function: `generate-feat-metadata`

**File**: `supabase/functions/generate-feat-metadata/index.ts`

Accepts:
```json
{
  "feat_title": "Flagellant",
  "feat_categories": ["Archetype"],
  "feat_content": "...",
  "fields": ["description", "prerequisites", "specialities", "blocking", "unlocks_categories", "subfeats"]
}
```

Uses tool calling to return structured output — one tool per field requested. The prompt will incorporate the metadata generation rules from memory:
- **description**: roleplay/personality flavor for Archetypes, practical effect for general feats. One short sentence.
- **prerequisites**: extract from content text, return as a string or null.
- **specialities**: only if content has parenthesized pattern and they are not standalone feats.
- **blocking**: feats that are explicitly incompatible per the content.
- **unlocks_categories**: categories this feat unlocks access to.
- **subfeats**: for Archetypes, standardize to 3-slot pattern (Faith, Core, Pool); for others, parse from content.

Returns:
```json
{
  "description": "A wandering penitent...",
  "prerequisites": "Strength 14",
  "specialities": ["Whip", "Flail"],
  "blocking": ["Heretic"],
  "unlocks_categories": null,
  "subfeats": [{ "slot": 1, "kind": "type", "filter": "Faith" }]
}
```

Only returns the fields that were requested.

**Config**: Add `[functions.generate-feat-metadata]` with `verify_jwt = false` to `supabase/config.toml`.

### 2. Update `FeatEditorPanel.tsx`

**Bulk generation toolbar** (next to "Download JSON & Clear DB"):
- A dropdown/select to pick which field(s) to generate: "Description", "Prerequisites", "Specialities", "Blocking", "Unlocks categories", "Subfeat slots", or "All"
- A "Generate All Missing" button that iterates feats where the selected field is empty/null, calls the edge function for each, and auto-saves the result to `feat_overrides`
- Progress indicator showing `done/total`
- 500ms delay between calls to avoid rate limits (same as translations)

**Per-feat generation** (inside each expanded feat):
- Add a sparkle/wand icon button next to each `OverrideField` label → calls the edge function for that single field on that feat, auto-saves
- Add a "Generate All" button at the top of each feat's editor → generates all empty fields at once for that feat (single API call with all fields requested)
- Loading spinner on the field while generating

### 3. Files changed

- **New**: `supabase/functions/generate-feat-metadata/index.ts` — edge function with tool calling
- **Edit**: `supabase/config.toml` — add function entry (but we don't edit this file directly, it's auto-managed)
- **Edit**: `src/components/FeatEditorPanel.tsx` — add bulk toolbar + per-field generate buttons

### Data flow

```text
FeatEditorPanel
  ├─ "Generate All [field]" button
  │    → loop feats where field is empty
  │    → supabase.functions.invoke("generate-feat-metadata")
  │    → auto-save result to feat_overrides
  │    → update local state
  │
  └─ Per-feat ✨ button on each field
       → supabase.functions.invoke("generate-feat-metadata")
       → auto-save to feat_overrides
       → update local state
```

### Prompt design

The system prompt will encode the metadata generation rules:
- Archetypes get roleplay flavor descriptions; general feats get mechanical effect descriptions
- Prerequisites are extracted literally from content
- Specialities only if parenthesized pattern exists and they aren't standalone feats
- Subfeats follow the slot system (fixed/list/type with filter)
- The full feat content + raw_content is sent as context

Tool calling schema ensures structured output (no JSON parsing of free text).

