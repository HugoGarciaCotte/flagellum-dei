

## Fix: Guest character editing stuck on "Loading character..."

**Problem**: `CharacterSheet` fetches character data using `useOfflineQuery("character-${characterId}")`. For guests, this query is disabled (treated as offline), and the individual character cache key `character-${charId}` is never populated. The wizard only seeds `my-characters-${userId}` (the list), not the per-character cache.

Additionally, `CharacterSheet.saveMutation` checks `if (!online)` instead of `if (!online || isGuest)`.

### Changes

**1. `src/components/CharacterCreationWizard.tsx`** — Seed individual character cache

In `saveArchetype` (offline/guest branch, after line 205), also populate the individual character cache:
```ts
setCacheData(`character-${tempCharId}`, newChar);
queryClient.setQueryData(["character", tempCharId], newChar);
```

In `saveFinalDetails` (offline/guest branch, after line 336), update the individual character cache:
```ts
const updatedChar = { id: characterId, user_id: user.id, name: name || "Blank", description: description || null, portrait_url: portraitUrl };
setCacheData(`character-${characterId}`, updatedChar);
queryClient.setQueryData(["character", characterId], updatedChar);
```

**2. `src/components/CharacterSheet.tsx`** — Fix guest save mutation

- Import `useAuth` and destructure `isGuest`
- Change `if (!online)` on line 55 to `if (!online || isGuest)`

**3. `src/pages/Dashboard.tsx`** — Seed individual cache when opening edit dialog

When setting `editingCharId`, also populate the individual character cache from the list data so CharacterSheet can find it:
```ts
// Find character from list and seed individual cache
const char = characters?.find(c => c.id === id);
if (char && (isGuest || !online)) {
  setCacheData(`character-${id}`, char);
  queryClient.setQueryData(["character", id], char);
}
```

This ensures character data is always available in the per-character cache for guests, both after creation and when editing from the dashboard.

