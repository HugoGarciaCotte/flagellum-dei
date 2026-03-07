

## Use Expanded Templates in Wiki Imports + Erase All Feats

### Problem
The import functions fetch raw wikitext via `action=query&prop=revisions`, which leaves `{{TemplateName}}` tags unexpanded. MediaWiki's `expandtemplates` API resolves all templates into their final wikitext output.

### Changes

**1. Update feat content fetching** (`supabase/functions/import-wiki-feats/index.ts`)

Replace the `action=query&prop=revisions` call (line 295) with `action=expandtemplates`:
```
https://prima.wiki/api.php?action=expandtemplates&title={title}&text={{:{title}}}&prop=wikitext&format=json
```
Parse the response as `data.expandtemplates.wikitext` instead of digging into revisions.

**2. Update scenario content fetching** (`supabase/functions/import-wiki-scenarios/index.ts`)

Same change at line 141 — use `expandtemplates` API and parse `data.expandtemplates.wikitext`.

**3. Delete all feats** (database migration)

```sql
DELETE FROM public.character_feat_subfeats;
DELETE FROM public.character_feats;
DELETE FROM public.feats;
```

This clears all feats so the user can reimport with expanded templates. Character feat associations are cleared too since they reference feats.

### Files changed
- `supabase/functions/import-wiki-feats/index.ts` — switch to expandtemplates API
- `supabase/functions/import-wiki-scenarios/index.ts` — switch to expandtemplates API
- **Migration** — delete all rows from `feats`, `character_feats`, `character_feat_subfeats`

