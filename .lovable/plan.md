## Goal

Drop the explicit "selected character" concept everywhere. The **current character** is implicit: the player's most recently updated one. Three surfaces show it the same way — current is prominent, others are tucked behind a collapsible "Other characters" toggle.

## Rule

`currentCharacter = characters.filter(not deleted).sort by updated_at desc, then created_at desc)[0]`

Editing any character bumps `updated_at`, which naturally promotes it to current. No user action ever "selects" a character anymore.

## Surfaces

### 1. `src/pages/PlayGame.tsx` (player in-game)

- Replace `selectedCharacter` (derived from `myPlayer.character_id`) with `currentCharacter` derived from `myCharacters` by recency.
- Pass `currentCharacter` to `DiceRoller` and the collapsed sheet header.
- In the expanded sheet:
  - Top block: current character (existing `CharacterListItem`) with a small "Current" badge and the Edit (pencil) button.
  - Below: `Collapsible` showing `{count} other characters`, listing the rest with only Edit actions. No ring, no click-to-select, no `selectCharacter` handler, no toast.
- Remove the auto-select effect and the click-to-select handler.
- Add one `useEffect` that silently mirrors `currentCharacter.id` into `game_players.character_id` whenever they diverge, so existing GM-side data, dice broadcast, and history keep working without UI ceremony.

### 2. `src/pages/Dashboard.tsx` (my characters list)

- Replace the flat grid with the same pattern:
  - Prominent: current character (most recently updated) with Edit + Delete actions.
  - Below: `Collapsible` "Other characters ({count})", same `CharacterListItem` rows with Edit + Delete.
- "New character" button stays in the section header.
- Keep the empty state as-is.

### 3. `src/components/GMPlayerList.tsx` (DM dashboard widget)

- Already has the prominent + collapsible "other characters" structure — only the data source changes.
- Replace `selectedCharId = gp.character_id` with: for each player, `currentChar = that player's characters sorted by updated_at desc`. Ignore `game_players.character_id` for display.
- `otherChars` = the rest.
- Everything else (edit dialog, pull-on-open) stays.

## Notes

- `CharacterListItem` already exists and is reused across all three surfaces — no component changes needed beyond a tiny optional "Current" badge passed via a new `badge?: ReactNode` prop (or rendered inline next to the name in the parents — TBD during implementation, prefer parent-side to avoid coupling).
- No schema change. `game_players.character_id` stays as a back-compat field, written silently from PlayGame.
- New translation keys (FR + EN):
  - `common.current` ("Current" / "Actuel")
  - `dashboard.otherCharacters` ("{count} other characters" / "{count} autres personnages")
  - Reuse existing `gm.otherCharacters` for the GM widget.

## Out of scope

- `HostGame` page (it already shows all players via `GMPlayerList`).
- Dice/GM broadcast logic — relies on `game_players.character_id` which we keep in sync.
- Character creation wizard / character sheet internals.

## Files

- edit: `src/pages/PlayGame.tsx`
- edit: `src/pages/Dashboard.tsx`
- edit: `src/components/GMPlayerList.tsx`
- edit: `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts` (2 new keys)