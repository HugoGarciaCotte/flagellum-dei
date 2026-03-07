

## Show Full Feat Content

### Problem
The `Feat` type and query omit the `content` field. Expanded views only show `description`.

### Changes — `src/components/CharacterFeatPicker.tsx`

1. **Add `content` to `Feat` type** (line 34): add `content: string | null`
2. **Update query select** (~line 56): change to `"id, title, categories, description, content"`
3. **Picker dialog expanded view** (~line 415): after the description paragraph, render `feat.content` in a styled block
4. **Character sheet feat rows**: add expandable state for assigned feats — clicking a feat name toggles showing `description` + `content` below the row. Apply to both level feats and free feats sections.

