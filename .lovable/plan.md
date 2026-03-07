

## Show All Player Characters to GM & Conditional Create Button

### Changes

#### 1. `src/pages/PlayGame.tsx` — Hide "New Character" when player has characters
- Only show the `CreateCharacterForm` / "New Character" button when `(myCharacters ?? []).length === 0`.
- When there are characters, just show the selectable list (no create option in-game).

#### 2. `src/pages/HostGame.tsx` — Fetch all characters per player (not just the selected one)
- Instead of fetching characters by `character_id` from `game_players`, collect all unique `user_id`s from players and fetch all characters for those users.
- Pass the full character list to `PlayerListSheet`.

#### 3. `src/components/PlayerListSheet.tsx` — Show all characters per player
- Update the component to display all characters belonging to each player (not just the one linked to `character_id`).
- Highlight the currently selected character (matching `character_id`).
- Use `CharacterListItem` for each character.

#### 4. Database: New RLS policy on `characters`
- Add a SELECT policy: "Host can view all game player characters by user" — allows the GM to see all characters owned by users who are players in their games.
```sql
CREATE POLICY "Host can view all characters of game players"
ON public.characters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_players gp
    JOIN games g ON g.id = gp.game_id
    WHERE gp.user_id = characters.user_id
    AND g.host_user_id = auth.uid()
  )
);
```

### Summary
- Players: no "New Character" button in-game if they already have characters
- GMs: see all characters per player, with the active one highlighted

