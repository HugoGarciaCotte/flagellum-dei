## Problem

The `game_players` SELECT policy "Host and members can view game players" contains a subquery against `game_players` itself:

```sql
... OR (EXISTS (SELECT 1 FROM game_players gp2
                WHERE gp2.game_id = game_players.game_id
                  AND gp2.user_id = auth.uid()))
```

Postgres re-applies RLS to that inner reference, causing infinite recursion. Any user belonging to at least one game (like hugo@garcia-cotte) triggers it as soon as the dashboard syncs characters/games.

## Fix

Introduce a `SECURITY DEFINER` helper that bypasses RLS, then rewrite the policy to use it.

```sql
CREATE OR REPLACE FUNCTION public.is_game_member(_game_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = _game_id AND user_id = _user_id
  )
$$;

DROP POLICY "Host and members can view game players" ON public.game_players;

CREATE POLICY "Host and members can view game players"
ON public.game_players
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.games g
             WHERE g.id = game_players.game_id
               AND g.host_user_id = auth.uid())
  OR public.is_game_member(game_players.game_id, auth.uid())
);
```

Also audit the `games` "Host and players can view games" policy — its `EXISTS … FROM game_players` subquery is fine on its own (different table), but I'll verify no symmetric recursion exists once the helper is in place.

## Scope

- One migration: helper function + policy replacement.
- No client code changes.
