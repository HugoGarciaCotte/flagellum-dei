

## Refine AI Validation Prompt & Pass Context

### Changes

#### 1. `src/components/CharacterFeatPicker.tsx`
- Update `validateWithAI` to accept additional context: `pickType` ("level" | "free" | "subfeat"), `level` (number | null), and `parentFeatTitle` (string | null for subfeats)
- Pass these from `handleFeatSelect` based on `pickerTarget`
- Update the `supabase.functions.invoke` call to include `{ characterId, featId, pickType, level, parentFeatTitle }`

#### 2. `supabase/functions/validate-feat/index.ts`
- Parse the new fields: `pickType`, `level`, `parentFeatTitle` from the request body
- Add context to the user prompt: "The player is picking this as a [level X feat / free feat / subfeat of {parentFeatTitle}]"
- Rewrite the system prompt to be more specific:

```
You are a TRPG rules validator for the Prima system...

Key rules:
1. ARCHETYPES & RESTRICTIONS: Some Archetypes explicitly forbid certain feats or categories. If the character has an Archetype whose content states that certain feats are illegal, deny those feats. Read each Archetype's content carefully for such restrictions.

2. PROWESS PREREQUISITES: Prowess feats often list prerequisites (e.g. "Prerequisite: ...", "Requires: ..."). The character must already have those feats. Be strict: if a prerequisite feat is missing, deny.

3. SUBFEAT RULES: By default, normal feats do NOT allow subfeats. A feat only allows subfeats if its content explicitly says so (e.g. mentions granting additional feats, slots, or sub-choices). If the player is picking a subfeat for a parent feat that does not mention allowing subfeats, deny it. Archetype feats always allow subfeats.

4. INCOMPATIBILITIES: If any feat content mentions incompatibilities or conflicts with other feats, enforce them strictly.

5. If the feat has NO prerequisites and no restrictions apply, allow it.

6. Be lenient about ambiguous requirements — if unsure, allow.
```

- Include in the user prompt the pick context: what level, whether it's a subfeat and of what parent

