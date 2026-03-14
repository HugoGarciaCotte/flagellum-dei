

## Plan: Improve translation prompt to allow natural deviation

### Change

**`supabase/functions/generate-translation/index.ts`** — Add a rule to the system prompt encouraging natural, non-literal translations:

Add to the rules list:
```
- Do not translate too literally — feel free to deviate from the English phrasing if it produces a more natural, elegant result in the target language
```

Single line addition, no other changes needed.

