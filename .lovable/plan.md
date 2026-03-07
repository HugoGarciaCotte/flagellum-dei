

## Erase Descriptions + AI-Generate on Import

### 1. Erase all existing descriptions (one-time data operation)

Use the insert tool to run two UPDATE statements:
```sql
UPDATE public.feats SET description = NULL;
UPDATE public.scenarios SET description = NULL;
```

### 2. Update `import-wiki-feats/index.ts`

During execute mode, after upserting each feat:
- Check if the existing record's description is empty/null (for modified items) or if it's a new item
- If description is empty, call Lovable AI (`google/gemini-3-flash-preview`) with the feat's title, content, and categories to generate a short 1-2 sentence description
- If description already exists and is non-empty, skip AI generation
- Use tool calling for structured output: `{ description: string }`
- On AI failure, fall back to `null` description (don't block the import)

The AI prompt: "You are a TTRPG content summarizer. Given a feat's title, categories, and wiki content, write a concise 1-2 sentence description suitable for display in a feat list. Focus on what the feat does mechanically."

### 3. Update `import-wiki-scenarios/index.ts`

Same pattern:
- After upserting each scenario, check if description is empty
- If empty, call AI with the scenario title and content to generate a 1-2 sentence description
- If non-empty, skip
- Prompt: "Write a concise 1-2 sentence summary of this TTRPG scenario suitable for a scenario selection list."

### 4. Update existing feats select to include description

Both import functions currently fetch existing records. The feats function already selects `content, categories` but not `description`. The scenarios function selects `id, title, content` but not `description`. Both need to include `description` in the select to check if it's already populated.

### Files changed
- `supabase/functions/import-wiki-feats/index.ts` — add AI description generation
- `supabase/functions/import-wiki-scenarios/index.ts` — add AI description generation
- Database: clear all descriptions (data operation)

