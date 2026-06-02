The browser is probably not stale. The backend is healthy, but the live policies still contain a circular path:

```text
characters policy -> game_players -> games policy -> game_players
```

That can still raise `infinite recursion detected in policy for relation "game_players"`, especially during character sync.

Plan:

1. Add security-definer helper functions that check game membership/host relationships without re-triggering row-level rules:
   - `is_game_member(game_id, user_id)` already exists; keep it.
   - add `is_game_host(game_id, user_id)`.
   - add character-scope helpers for “host can view/update player characters” so character policies no longer query `game_players` directly.

2. Rewrite recursive policies:
   - `games` read policy: use `is_game_member(...)` instead of querying `game_players` inside the policy.
   - `game_players` read policy: use `is_game_host(...)` instead of querying `games` inside the policy.
   - `characters` host read/update policies: replace direct joins through `game_players`/`games` with the new helper functions.

3. Lock down helper execution permissions:
   - revoke public/anonymous execution.
   - grant only authenticated users access to the safe helper functions.

4. Validate after migration:
   - re-read policies to confirm there are no remaining `game_players` subqueries inside policies that can recurse.
   - run a targeted read-path check against the affected tables.

No frontend code changes should be needed.