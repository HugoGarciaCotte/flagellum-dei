

## "Improve with AI" for Scenario Content Editor

### Overview
Add an "Improve with AI" button to the content editor. When clicked, it opens a side panel where you type a prompt (e.g. "add more atmospheric descriptions", "fix section breaks", "add an ambiance track for the tavern scene"). The AI returns modified content, displayed side-by-side with the original. You can accept/reject individual changed lines, then save.

### Architecture

**New edge function**: `supabase/functions/improve-scenario-content/index.ts`
- Receives: `{ content, instruction }` (the current wikitext content + freeform user instruction)
- System prompt explains the wikitext format, available tags (background_image, ambiance track, playlist, queue_track, section breaks), and tells the AI to return the full modified content
- Uses `google/gemini-2.5-pro` via Lovable AI gateway (good for big context + reasoning)
- Returns: `{ improved_content: string }`
- Non