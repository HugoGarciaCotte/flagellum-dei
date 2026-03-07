

## Fix Feat Import Timeout & Description Prompt

### Problem
1. The edge function times out when importing many feats because each feat sequentially calls the AI for description generation.
2. The AI prompt asks for "1-2 sentences" but should produce a short one-liner of the mechanical effect.

### Plan

**1. Increase client-side timeout (`src/components/ImportFeatsCard.tsx`)**
- Pass a longer timeout to `supabase.functions.invoke` for the execute call (e.g. 300 seconds / 5 minutes) using the `signal` from an `AbortController` with a 5-minute timeout.

**2. Process AI descriptions in batches (`supabase/functions/import-wiki-feats/index.ts`)**
- Instead of awaiting each AI call sequentially, process feats in parallel batches of 5 to speed up the import significantly.

**3. Fix description prompt**
- Change the system prompt from "write a concise 1-2 sentence description" to "write a single short sentence describing the feat's mechanical effect, suitable for a compact list view."

### Files changed
- `src/components/ImportFeatsCard.tsx` — add AbortController with 5-min timeout on execute call
- `supabase/functions/import-wiki-feats/index.ts` — batch parallel AI calls (5 at a time), update prompt wording

