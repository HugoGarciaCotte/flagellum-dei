

## Push Parseable Fields to Wiki

### Security First

Your wiki password must be stored as a secret, **never in code**. I'll use the secrets tool to store `WIKI_USERNAME` and `WIKI_PASSWORD` before proceeding with implementation.

### New Edge Function: `push-wiki-feats`

Creates `supabase/functions/push-wiki-feats/index.ts` that:

1. **Authenticates** the caller (owner/admin only, same pattern as other functions)
2. **Logs into MediaWiki** using stored `WIKI_USERNAME`/`WIKI_PASSWORD` secrets via the `action=login` + `action=clientlogin` API flow (or bot password flow)
3. **Fetches current wiki page** content for the given feat title via `action=parse` or `action=query&prop=revisions`
4. **Generates the parseable fields block** from the feat's DB data:
```text
<!--@ PARSEABLE FIELDS START @-->
<!--@ feat_one_liner: ... @-->
<!--@ feat_specialities: ... @-->
<!--@ feat_subfeat:1: ... @-->
<!--@ feat_unlocks: ... @-->
<!--@ PARSEABLE FIELDS END @-->
```
5. **Merges intelligently**:
   - If `<!--@ PARSEABLE FIELDS START @-->...<!--@ PARSEABLE FIELDS END @-->` block exists → replace it entirely
   - If no block exists → append it at the end of the page content
6. **Pushes the edit** via `action=edit` with the updated content
7. Accepts `{ id: string }` in the request body (single feat) or `{ ids: string[] }` for bulk

### Config Addition

Add to `supabase/config.toml`:
```toml
[functions.push-wiki-feats]
verify_jwt = false
```

### Admin UI: `src/components/ManageFeats.tsx`

- Add an **"Upload" icon button** (Upload icon from lucide) next to "Copy Wiki Tags" in each feat's expanded actions
- On click, calls `supabase.functions.invoke("push-wiki-feats", { body: { id: feat.id } })`
- Shows loading state and toast on success/failure
- Also add a **"Push All to Wiki"** button in the card header next to "Regenerate All AI" for bulk operations

### Secrets Required

Two new secrets need to be added:
- `WIKI_USERNAME` → `Taiko`
- `WIKI_PASSWORD` → your wiki password

I'll prompt you to enter these securely via the secrets tool during implementation.

### No database changes needed.

