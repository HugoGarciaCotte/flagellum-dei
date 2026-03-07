

## AI-Powered Feat Prerequisite Validation

### Overview

When a player selects a feat, before saving it, call a backend function that uses AI to analyze whether the character meets all prerequisites. The AI receives the full character context (all current feats with their descriptions/content) and the target feat's full content, then returns whether it's allowed and why not if blocked.

### 1. New Edge Function: `supabase/functions/validate-feat/index.ts`

- Receives: `characterId`, `featId` (the feat being picked)
- Fetches from DB:
  - The target feat (title, content, description, categories)
  - All current character_feats for this character, joined with feat details
  - The character's name/description
- Sends to Lovable AI (`google/gemini-3-flash-preview`) with a system prompt:
  - "You are a TTRPG rules validator. Given a character's current feats and a new feat they want to acquire, determine if they meet all prerequisites. Check the feat descriptions for prerequisite requirements. Return JSON via tool calling: `{allowed: boolean, reason: string}`"
- Returns the AI's verdict to the client

### 2. Update `supabase/config.toml`

Add the new function entry with `verify_jwt = false`.

### 3. Update `CharacterFeatPicker.tsx`

- In the `upsertMutation`, before inserting, call the edge function to validate
- If `allowed: false`, show a toast with the AI's reason and abort the insert
- Show a brief loading state ("Checking prerequisites...") while the AI validates
- Only apply validation in `player` mode — GM mode bypasses validation

### Technical Details

**Edge function payload to AI:**
```typescript
const messages = [
  { role: "system", content: "You are a TTRPG prerequisite validator..." },
  { role: "user", content: `Character: ${charName}\nCurrent feats:\n${currentFeatsFormatted}\n\nWants to acquire: ${targetFeat.title}\n${targetFeat.content}` }
];
// Use tool calling for structured output: {allowed: boolean, reason: string}
```

**Validation flow in CharacterFeatPicker:**
```
Player clicks feat → "Checking prerequisites..." → AI responds →
  If allowed: insert into character_feats
  If blocked: toast with reason, no insert
```

### Files changed
- `supabase/functions/validate-feat/index.ts` — new edge function
- `supabase/config.toml` — add function entry
- `src/components/CharacterFeatPicker.tsx` — call validation before insert (player mode only)

