

## Fix: Character feats/subfeats not showing — broken DB joins to removed `feats` table

### Root Cause
The `feats` table was removed from the database (feats are now hardcoded in source code), but two places still try to JOIN against it:

1. **`CharacterListItem.tsx`** — queries `character_feats` with `feats!character_feats_feat_id_fkey(title)` join → 400 error
2. **`generate-character-portrait/index.ts`** — queries `character_feats` with `feats(title)` join → will also fail

### Fix Strategy
Since feat data lives in local source code (`src/data/feats.ts`), resolve feat titles client-side using `getFeatById()` instead of DB joins.

### Changes

**1. `src/components/CharacterListItem.tsx`** — Remove DB joins, resolve locally

- Query `character_feats` selecting only `id, feat_id` (no join)
- Query `character_feat_subfeats` selecting only `character_feat_id, subfeat_id` (no join)
- Import `getFeatById` from `@/data/feats`
- Resolve titles via `getFeatById(feat_id)?.title` in the render

**2. `supabase/functions/generate-character-portrait/index.ts`** — Accept feat names from client

- Change the edge function to accept an optional `featNames` array in the request body
- If not provided, fall back to querying `character_feats` for just `feat_id` (no join) — titles won't be available but it won't crash
- Update `CharacterSheet.tsx` to pass `featNames` from the client (which has local feat data)

**3. `src/components/CharacterSheet.tsx`** — Pass feat names to portrait generation

- Before calling `generate-character-portrait`, look up the character's feat IDs from the `character-feats` query cache or do a quick query, resolve titles locally, and pass them in the request body

