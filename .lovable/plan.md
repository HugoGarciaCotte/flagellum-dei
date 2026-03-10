

## Updated plan: Keep `validate-feat` edge function

The previous plan called for deleting 7 edge functions. This revision **keeps `validate-feat`** and deletes only 6.

### What changes from the approved plan

| Item | Previous | Updated |
|---|---|---|
| `supabase/functions/validate-feat/` | Delete | **Keep** |
| `CharacterFeatPicker.tsx` validate-feat call | Remove | **Keep as-is** (already skips when offline at line 216) |

### Edge functions to delete (6 instead of 7)

1. `check-feats-ai`
2. `push-wiki-feats`
3. `import-wiki-feats`
4. `regenerate-description`
5. `check-wiki-redirects`
6. `import-wiki-scenarios`

### Everything else remains the same

- Create `src/data/feats.ts` with all 147 feats + 50 redirects hardcoded
- Replace all client Supabase queries for `feats` and `feat_redirects` with local imports
- Drop `feats` and `feat_redirects` DB tables via migration
- Delete `useOfflineFeats.ts`, clean up `offlineStorage.ts`
- Gray out all wiki import/export UI in admin
- Make `ManageFeats.tsx` and `ManageRedirects.tsx` read-only viewers of hardcoded data

The `validate-feat` edge function reads feat data from the DB — but since we're dropping the `feats` table, it needs to be updated to receive feat data in the request body from the client (which already has it from the bundle), or we embed a copy of the feats in the function. The simplest approach: **have the client pass the necessary feat context in the request body** instead of the function querying the DB. The function already receives `characterId` and `featId` — we'll add `targetFeat` and `currentFeats` data so it doesn't need to query the `feats` table.

