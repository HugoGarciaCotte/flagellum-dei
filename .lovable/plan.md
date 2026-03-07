

## Add "My Players" Section for Game Masters

### What
Below the "Host a Game" collapsible on the Dashboard, add a new collapsible section visible only to Game Masters. It lists all unique players who have ever joined any of their games, with their character name/description and an edit button that opens a dialog with character editing and the feat picker.

### How

**1. New query: fetch all players from GM's games** (in `Dashboard.tsx`)
- Query `game_players` joined with `games` (filtering `host_user_id = user.id`), `characters`, and `profiles`
- Deduplicate by `user_id` (a player may have joined multiple games), keeping the latest character
- Only enabled when `isGameMaster` is true

```sql
-- Conceptual query
SELECT DISTINCT gp.user_id, gp.character_id, 
       profiles.display_name, characters.*
FROM game_players gp
JOIN games g ON g.id = gp.game_id AND g.host_user_id = auth.uid()
LEFT JOIN characters ON characters.id = gp.character_id
LEFT JOIN profiles ON profiles.user_id = gp.user_id
```

**2. New UI section** (in `Dashboard.tsx`)
- A `Collapsible` section with a `Users` icon titled "My Players"
- Placed right after the "Host a Game" collapsible, only shown when `isGameMaster`
- Each player card shows: display name, character name/description, edit button
- Edit opens a dialog with character name/description inputs + `CharacterFeatPicker` in `mode="gm"`

**3. Character update mutation**
- Reuse or add a mutation that updates `characters` table by id (the GM already has RLS permission via the "Host can update game player characters" policy)

### RLS
Already covered — existing policies allow hosts to view and update game player characters. The query joins through `games` where `host_user_id = auth.uid()`.

### Files changed
- `src/pages/Dashboard.tsx` — add query, state, and UI section

