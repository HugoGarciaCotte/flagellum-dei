## Tweak Name Generation Prompt

### Current State

The edge function `generate-character-details/index.ts` (line 23-26) already receives `description` and `archetype` from the client and mentions "French, English, German, Italian, Spanish, or Eastern European" origins.

### Change: `supabase/functions/generate-character-details/index.ts`

Update the name generation prompt (lines 22-26) to:

- Expand the list of origins to explicitly include **Flemish, Burgundian, Castilian, Bohemian, Hungarian, Scandinavian** alongside French, English, German, Italian
- Emphasize that the name should sound historically authentic for the 1340 period
- Keep the description front and center as context for the name's tone

New prompt:

```
Generate a single historically authentic name (first name and surname) for a person living in Europe around 1340 AD. The character is described as: "${description}". Their archetype is: ${archetype}.
The name should sound period-appropriate and could be from any European origin: French, English, German, Flemish, Italian, Castilian, or Eastern European.
Output ONLY the full name, nothing else. No quotes, no explanation.
```

### Single file change

- `supabase/functions/generate-character-details/index.ts` — update the prompt string in the `type === "name"` branch.