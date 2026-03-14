

## Plan: Make translation prompt more literary

### Change

**`supabase/functions/generate-translation/index.ts`** — Two edits to the system prompt rules (lines 36-37):

1. **Remove** `"; clear and functional when it's UI text"` from the tone rule (line 36)
2. **Replace** the current "do not translate too literally" rule (line 37) with a stronger directive:

```
- Do not translate literally — rewrite the meaning in the target language with full literary freedom. It is acceptable to lose minor nuances if the result reads more naturally and elegantly
```

Final rules block will read:
```
- Match the tone: dark, atmospheric, medieval
- Do not translate literally — rewrite the meaning in the target language with full literary freedom. It is acceptable to lose minor nuances if the result reads more naturally and elegantly
- Return ONLY the translated text, nothing else — no quotes, no explanations
```

