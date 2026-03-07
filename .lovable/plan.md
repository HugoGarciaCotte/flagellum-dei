

## Display Feat Details (Description, Special, Prerequisites, Synonyms)

### Problem
When a feat is expanded (both in the character sheet and in the picker dialog), it currently shows raw MediaWiki template content. The content uses a `{{Feats | field = value }}` template format. We need to parse out specific fields and display them in a structured, readable way.

### Content Format
Feat content follows this pattern:
```
{{Feats
| Synonyms = Climb, Jump, Run
| Prowess Prerequisites = [[Noble]], [[Rich]]
| Special = Leave blank if none.
| Description = 
Multi-line description text...
}}
```

### Approach

**1. Create a parser utility function** in `src/lib/parseFeatContent.ts`

A function `parseFeatFields(content: string)` that extracts key fields from the `{{Feats ... }}` template:
- `description` — the Description field (multi-line)
- `special` — the Special field (skip if "Leave blank if none" or empty)
- `prerequisites` — from "Prowess Prerequisites" field, strip `[[` wiki links
- `synonyms` — the Synonyms field

Returns `{ description, special, prerequisites, synonyms }` with nulls for missing/empty fields.

Parsing logic: split on `| FieldName =` boundaries, collect lines until next field or `}}`.

**2. Update expanded feat display in `CharacterFeatPicker.tsx`**

Replace the raw `content` dump in three places:
- **Level feats expanded view** (line ~614-616)
- **Free feats expanded view** (line ~703-704)
- **Picker dialog expanded view** (line ~795-797)

In all three, replace with structured display:
- **Description** — shown as the main text block
- **Prerequisites** — shown with a label if present
- **Special** — shown with a label if present
- **Synonyms** — shown as a subtle line if present

### Files Changed
- `src/lib/parseFeatContent.ts` (new) — parser utility
- `src/components/CharacterFeatPicker.tsx` — use parsed fields in expanded views

