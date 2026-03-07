

## Fix: Push to Wiki "Page Not Found" Bug

The `getPageContent` function in `push-wiki-feats/index.ts` requests `rvslots=main` and reads from `revisions[0].slots.main["*"]`, but prima.wiki's MediaWiki version doesn't support `rvslots`. It returns content at `revisions[0]["*"]` instead, so the function always returns `null`.

### Change in `supabase/functions/push-wiki-feats/index.ts`

Update `getPageContent` to:
1. Remove the `rvslots=main` parameter
2. Read content from `revisions[0]["*"]` instead of `revisions[0].slots.main["*"]`

```typescript
// Before:
url.searchParams.set("rvslots", "main");
// ...
return pages[pageId]?.revisions?.[0]?.slots?.main?.["*"] ?? null;

// After:
// (remove rvslots line)
return pages[pageId]?.revisions?.[0]?.["*"] ?? null;
```

Single file, two-line fix. No other changes needed.

