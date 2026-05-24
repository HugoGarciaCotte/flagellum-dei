The toast means the app tried to insert a new non-free feat for the same character + level before the old one was deleted on the backend. Because `character_feats_level_unique` allows only one paid feat per character level, the push fails and the new feat stays only in local cache.

Plan:

1. Change paid feat replacement to reuse the existing `character_feats` row for that level instead of soft-deleting it and creating a new row.
   - This turns “replace level feat” into an update by primary key.
   - It avoids the backend unique constraint conflict entirely.
   - Existing subfeats for the previous feat will still be soft-deleted.

2. Keep free feats unchanged.
   - Free feats use `is_free = true`, so they are not part of `character_feats_level_unique`.

3. Improve sync conflict reporting for this specific case.
   - Keep the current sync-error toast, but the core fix should prevent this duplicate-key path from happening when selecting/replacing a level feat.

4. Verify by checking the changed code path.
   - Confirm `CharacterFeatPicker` no longer creates a second non-free row for an occupied level.