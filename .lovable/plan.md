

## Fix: Character feat summary not showing subfeats

**Root cause**: Cache invalidation mismatch. The `CharacterListItem` component uses query key `character-feats-summary` to fetch feats and subfeats. However, neither the `CharacterCreationWizard` nor the `CharacterFeatPicker` ever invalidates this key — they only invalidate `character-feats`, `character-feat-subfeats`, and `my-characters`. So the summary card shows stale (often empty) data after character creation or feat editing.

Thordek works because its cache happened to be fresh (e.g., page was reloaded after creation).

**Fix**: Two changes in `src/components/CharacterFeatPicker.tsx` and `src/components/CharacterCreationWizard.tsx`:

1. **`CharacterFeatPicker.tsx`**: Add `queryClient.invalidateQueries({ queryKey: ["character-feats-summary"] })` alongside every existing `character-feats` invalidation (4 mutation `onSuccess` callbacks).

2. **`CharacterCreationWizard.tsx`**: Add `queryClient.invalidateQueries({ queryKey: ["character-feats-summary"] })` alongside every existing `my-characters` invalidation (3 places: after archetype save, subfeat save, and final save).

This ensures the dashboard card always reflects the latest feats/subfeats after any edit.

