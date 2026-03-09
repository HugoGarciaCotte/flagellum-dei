

## Investigation Summary

I checked the database directly:
- Character "Test" has **Aristocrat** with subfeats: ⭐ Faith, Noble, Background -- the data IS in the database
- Character "Johannes von Tepl" has **Alchemist** with subfeats: ⭐ Faith, Knowledge, Eternal Youth

The `CharacterListItem` query uses PostgREST nested embeds:
```
.select("id, feat_id, feats(title), character_feat_subfeats(subfeat_id, feats(title))")
```

The issue is likely a **PostgREST FK ambiguity**: both `character_feats.feat_id` and `character_feat_subfeats.subfeat_id` reference `feats.id`. When resolving the inner `feats(title)` inside `character_feat_subfeats(...)`, PostgREST may get confused about which FK to use, silently returning empty results for the nested join.

## Plan

**File: `src/components/CharacterListItem.tsx`**

Add explicit FK hints to the Supabase query to disambiguate:

```typescript
.select("id, feat_id, feats!character_feats_feat_id_fkey(title), character_feat_subfeats!character_feat_subfeats_character_feat_id_fkey(subfeat_id, feats!character_feat_subfeats_subfeat_id_fkey(title))")
```

This tells PostgREST exactly which foreign key to follow for each embed, preventing ambiguity between the two `feats` references.

Single file change, single line fix.

