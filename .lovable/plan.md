

## Fix: Invalid CSRF Token on Wiki Push

**Root cause**: The `cookies` array accumulates duplicate cookie names across multiple API calls (login token fetch, login POST, CSRF token fetch). When sent as `Cookie: a=1; a=2`, MediaWiki sees conflicting values and invalidates the CSRF token.

### Change in `supabase/functions/push-wiki-feats/index.ts`

Replace the cookie array with a `Map<string, string>` to deduplicate by cookie name:

1. Change `WikiSession.cookies` from `string[]` to `Map<string, string>`
2. Update `collectCookies` to parse `name=value` and store in the Map
3. Update all `session.cookies.join("; ")` references to serialize from the Map
4. Update `getEditToken` similarly

This is a ~15-line refactor across `wikiLogin`, `getEditToken`, `getPageContent`, and `editPage` — just changing how cookies are stored and serialized.

