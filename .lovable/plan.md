## Context

- `HostGame` (in-game) uses `PlayerListSheet` which already shows each player's selected character **plus** a collapsible "other characters" list with edit buttons.
- `Dashboard` (main GM screen) uses `GMPlayerList` which only shows the currently-selected character per player — no access to the player's other characters.

## Fix

Bring `GMPlayerList` to parity with `PlayerListSheet`:

### `src/components/GMPlayerList.tsx`
1. Stop deduplicating per `user_id`. Instead build, per game-player row:
   - `display_name`
   - the player's `selected character` (if any)
   - all of that player's **other** characters (from `allCharacters` filtered by `user_id`, excluding the selected one)
2. Render each player card as:
   - Player name header
   - Selected character via `CharacterListItem` with a Pencil button (same as today)
   - If there are other characters → a `Collapsible` "N other character(s)" trigger (reuse `gm.otherCharacters` key) listing each as a compact row with name + Pencil button
   - If the player has no selected character → keep the existing "no character selected" italic line, and still show the collapsible if they have any characters
3. Edit click on any character (selected or other) opens the existing `CharacterSheet` dialog with `mode="gm"`, and runs the same pull-on-open refresh already in place (characters / character_feats / character_feat_subfeats by character id). Extract that into a small `openEdit(characterId)` helper so it works for both lists.

### Out of scope
- No changes to `HostGame`, `PlayerListSheet`, sync, RLS, or any other screen.
- No new i18n keys (reuse existing `gm.otherCharacters`, `gm.noCharacterSelected`).
- Layout stays as a `Collapsible` panel on the dashboard; only the per-player block grows.

## Files to change
- `src/components/GMPlayerList.tsx`