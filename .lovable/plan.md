

## Update AI Description Prompts: Archetypes = Flavor, Others = Effect

Two files need prompt updates to differentiate description style based on whether the feat is an Archetype or not.

### Changes

#### 1. `supabase/functions/regenerate-description/index.ts` — `generateDescription` (line 97)

Replace the system prompt to distinguish archetypes from other feats:

```
You are a TRPG content summarizer. Given a feat's title, categories, and wiki content, write a single short sentence (under 15 words).

IMPORTANT RULE for tone:
- If the feat is an ARCHETYPE (has "Archetype" in its categories): describe the CHARACTER PERSONALITY and FLAVOR — who this person is, their temperament, their place in medieval society. Do NOT mention game mechanics.
- If the feat is NOT an archetype: describe the feat's PRACTICAL EFFECT — what it lets the character do, their capability. Be vivid but focus on the tangible ability.

Do not copy these examples, generate original text in the same spirit:
- Archetype example tone: "A cunning dealmaker who thrives in the shadowy markets of medieval cities."
- Non-archetype example tone: "Move with uncanny grace, scaling walls and dodging blows effortlessly."
```

The categories are already passed in the user message, so the AI can detect "Archetype" in the category list.

#### 2. `supabase/functions/check-feats-ai/index.ts` — system prompt (line 88)

Update the description field guidance from:
```
- description: A short (under 15 words) mechanical summary
```
To:
```
- description: A short (under 15 words) sentence. For Archetypes: character personality/flavor (who they are). For other feats: practical effect (what they can do). Never mechanical jargon.
```

#### 3. `supabase/functions/regenerate-description/index.ts` — `generateSubfeats` (lines 130-142)

Add archetype-specific guidance to the system prompt, teaching the standard 3-slot pattern:

```
ARCHETYPE PATTERN: If the feat is an Archetype, it almost always follows this structure:
- Slot 1: "list, optional" containing "⭐ Faith" (and "⭐ Dark Faith" if the wiki content mentions dark faith is allowed). This represents the optional faith choice.
- Slot 2: Usually "fixed" with a single feat the archetype always grants. Sometimes "list" if there are multiple options.
- Slot 3: A long "list" of ALL feats the archetype can access during level-up. This is the archetype's full feat pool.

Example for an Alchemist archetype:
Slot 1: kind=list, optional=true, options=["⭐ Faith"]
Slot 2: kind=fixed, feat_title="Knowledge"
Slot 3: kind=list, optional=false, options=["Knowledge (apothecary)", "Knowledge (pyrotechnics)", "Rich", "Eternal Youth", ...]
```

### No database or frontend changes needed.

