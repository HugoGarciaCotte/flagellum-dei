

## Refine Translation Prompt for UI vs Narrative Text

### Problem
The current system prompt tells the AI to "rewrite the meaning with full literary freedom" for **all** keys — including purely functional UI labels like "Login", "Sign up", "My characters", "Join as guest". This produces overly creative translations that sound wrong for buttons and navigation.

### Fix
One change in `supabase/functions/generate-translation/index.ts` (lines 30-38). Update the system prompt to distinguish UI elements from narrative content:

```
Rules:
- Preserve any HTML tags, links, CSS classes, and formatting exactly as they are
- Do NOT translate proper nouns like "Flagellum Dei", "Danse Macabre", "Prima", "Lovable", "GitHub"
- For short UI elements (buttons, labels, menu items, placeholders, form fields): use standard, direct, literal translations. "Login" → "Connexion", "Sign up" → "Inscription", "My characters" → "Mes personnages". Do NOT get creative with these.
- For narrative or atmospheric content (descriptions, teasers, landing page prose, flavor text): match the dark medieval tone and translate with literary freedom. It is acceptable to lose minor nuances if the result reads more naturally and elegantly.
- Determine which category applies from the key name and HTML context
- Return ONLY the translated text, nothing else — no quotes, no explanations
```

### Files
1. `supabase/functions/generate-translation/index.ts` — update system prompt (~8 lines)

