

## Rethink Import/Export/AI Flow for Feats

### Current Problems
1. **Import** triggers AI generation — it shouldn't. Import should be a pure content sync.
2. **Regenerate AI** currently preserves wiki-embedded tags (skips if `meta.X` exists from content) — it should wipe all parseable fields and regenerate fresh.
3. **No "Check with AI"** flow exists — need a new review mode that compares AI suggestions against current fields.
4. **Push to Wiki** currently gets raw wiki source and merges the full parseable block — this is correct conceptually but the current `push-wiki-feats` function already does this properly via `getPageContent` (raw revisions API, not expandtemplates). Confirmed working.

### New Architecture

```text
┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Check Updates   │   │  Regenerate AI   │   │  Check with AI   │
│  (Import from    │   │  (Wipe & regen   │   │  (AI reviews     │
│   Wiki)          │   │   all parseable   │   │   existing       │
│                  │   │   fields)         │   │   fields)        │
│  NO AI at all    │   │                  │   │                  │
│  Pure content    │   │  Erases block,   │   │  Returns diff    │
│  sync            │   │  calls AI for    │   │  suggestions     │
└─────────────────┘   │  all 3 fields,   │   └──────────────────┘
                      │  rebuilds block   │
                      └──────────────────┘

┌─────────────────┐
│  Push to Wiki   │
│  (Only parseable│
│   fields block) │
│                 │
│  Gets raw wiki  │
│  source, strips │
│  old block,     │
│  appends new    │
└─────────────────┘
```

### Changes

#### 1. `supabase/functions/import-wiki-feats/index.ts`
- **Remove all AI generation functions** (`generateDescription`, `generateSubfeats`, `generateSpecialities`) — ~230 lines deleted
- **Execute mode**: Simply upsert `content` (with existing parseable block preserved from wiki) + `categories`. No AI calls at all.
- The expanded wiki content already includes any `<!--@ ... @-->` tags the wiki has — those get stored as-is.

#### 2. `supabase/functions/regenerate-description/index.ts`
- **Change "Regenerate AI" behavior**: When called for a feat, **strip existing parseable block first**, then generate all 3 fields fresh (description, subfeats, specialities), rebuild block, merge into content.
- Add a new action `"regenerate_all"` that does all 3 in one call instead of 3 sequential calls from the frontend.
- Remove the "skip if wiki meta exists" logic — regenerate always means regenerate.

#### 3. New edge function: `supabase/functions/check-feats-ai/index.ts`
- Accepts `{ id }` (single feat) or `{ ids }` (batch) or `{ all: true }`
- For each feat: strips parseable block from content, sends to AI asking it to generate the ideal parseable fields, then **compares** against existing fields
- Returns a diff per feat: `{ title, id, suggestions: { field, current, suggested, action: "add"|"modify"|"delete" }[] }`
- Does NOT write anything — just returns the diff

#### 4. Frontend: `src/components/ImportFeatsCard.tsx`
- Add a "Push to Wiki" button next to "Check for Updates"
- Push button invokes a new preview mode on push-wiki-feats that compares DB parseable block vs wiki parseable block, shows which feats differ, then confirms to push
- Keep existing import flow but it no longer mentions AI

#### 5. Frontend: `src/components/ManageFeats.tsx`
- **"Regenerate All AI"** button: calls `regenerate-description` with `{ action: "regenerate_all" }` for each feat sequentially — this wipes and regenerates all parseable fields
- **"Regenerate AI"** per feat: same single call
- **New "Check All with AI"** button: calls `check-feats-ai` with `{ all: true }`, displays results in a review dialog showing per-feat diffs with checkboxes, then a "Regenerate Selected" button that regenerates only checked feats
- Remove "Push All to Wiki" and per-feat "Push to Wiki" from ManageFeats (moved to ImportFeatsCard)

#### 6. `supabase/functions/push-wiki-feats/index.ts`
- Add a `mode: "preview"` that fetches raw wiki source for each feat, compares parseable blocks, returns status per feat (unchanged/modified/new-block)
- The execute mode (existing) already correctly: gets raw wiki source → strips old parseable block → appends new one. This is safe because it uses the revisions API (not expandtemplates), so templates stay intact.

#### 7. `supabase/config.toml`
- Add entry for the new `check-feats-ai` function

### Files Changed
- `supabase/functions/import-wiki-feats/index.ts` — simplify, remove AI
- `supabase/functions/regenerate-description/index.ts` — always wipe+regen, add `regenerate_all` action
- `supabase/functions/check-feats-ai/index.ts` — new edge function
- `supabase/functions/push-wiki-feats/index.ts` — add preview mode
- `src/components/ImportFeatsCard.tsx` — add Push to Wiki button with preview
- `src/components/ManageFeats.tsx` — add "Check All with AI" flow, update regenerate behavior
- `supabase/config.toml` — add check-feats-ai

