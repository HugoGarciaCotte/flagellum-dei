

## Collapse Unselected Characters in GM Views

### Problem
In the **PlayerListSheet** (host game view), all of a player's characters are shown equally — no visual distinction between the selected and unselected ones. The GM has to scan for the small checkmark. Unselected characters should be collapsed to reduce clutter.

In the **GMPlayerList** (dashboard "My Players"), it currently only shows one character per player via a deduplication map. It should show the selected character prominently and acknowledge if the player hasn't selected one yet.

### Changes

**`src/components/PlayerListSheet.tsx`**
- Sort each player's characters: selected character first
- Show the selected character as a full `CharacterListItem` (as today)
- Wrap unselected characters in a `Collapsible` (collapsed by default) with a small trigger like "N other characters" — only shown if the player has more than one character
- Unselected characters render as compact items (just name, no description) inside the collapsible

**`src/components/GMPlayerList.tsx`**
- Update the query to fetch `character_id` from `game_players` so we know which character each player has selected in the game
- Show the selected character prominently (as today)
- If no character is selected, show "No character selected" (as today)
- No other changes needed here since it already only shows one character per player — the selected one

