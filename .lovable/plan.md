

## Switch Scenario Import to Raw Content

**Problem**: Scenarios currently use the `expandtemplates` API which strips HTML comments (same issue feats had). Switch to fetching raw wikitext instead.

### Changes in `supabase/functions/import-wiki-scenarios/index.ts`

1. **Change the fetch URL** (line ~141): Replace the `expandtemplates` API call with the `revisions` API to get raw wikitext:
   - Old: `action=expandtemplates&title=...&text={{:...}}&prop=wikitext`
   - New: `action=query&titles=...&prop=revisions&rvprop=content&rvslots=main`

2. **Update content extraction** (line ~145): Parse the response from the revisions API format instead of `expandtemplates`:
   - Old: `pageData?.expandtemplates?.wikitext`
   - New: Extract from `pageData?.query?.pages?.[pageId]?.revisions?.[0]?.slots?.main?.content`

Single file, ~5 lines changed. No DB migration needed. The `content` column in `scenarios` will now store raw wikitext, which the existing `parseWikitext` engine already handles.

