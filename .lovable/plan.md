

## Standardize Character Summary Display

### Problem
The `GMPlayerList` and `PlayerListSheet` show only the character name/description but not the feat summary. The `CharacterListItem` on the Dashboard already shows the collapsed feat list. These should all use the same component.

### Solution
Reuse `CharacterListItem` in both `GMPlayerList` and `PlayerListSheet` wherever a character is displayed in a list. `CharacterListItem` already fetches and displays the feat summary (with subfeats) — it just needs to be used consistently.

### Changes

#### 1. `src/components/GMPlayerList.tsx`
- Import `CharacterListItem`.
- Replace the manual `Card` rendering per player with:
  - Player display name as a label above
  - `CharacterListItem` for the character (when `character_id` exists), passing the edit `Pencil` button as `actions`.
  - Keep "No character selected" fallback.

#### 2. `src/components/PlayerListSheet.tsx`
- Import `CharacterListItem`.
- Replace the manual character display (lines 73-86) with `CharacterListItem`, passing the `Pencil` edit button as `actions`.
- Keep the player name above and the "No character selected" fallback.

### Files Changed
1. `src/components/GMPlayerList.tsx` — Use `CharacterListItem` for each player's character
2. `src/components/PlayerListSheet.tsx` — Use `CharacterListItem` for each player's character

