## Root cause

When Hugo (or any non-owner) signs in, the app calls:

```
GET /rest/v1/user_roles?select=*&user_id=eq.<hugo>
```

Postgres evaluates every RLS policy on `user_roles` for that SELECT. One of them, "Owner can manage roles", is `FOR ALL USING (has_role(auth.uid(), 'owner'))`. Evaluating it requires `EXECUTE` on `public.has_role(uuid, app_role)`, which is **not granted to `authenticated`**. PostgREST returns:

```
403 {"code":"42501","message":"permission denied for function has_role"}
```

Because the query errors out, the "Users can view own roles" policy never gets a chance to return Hugo's row. `user_roles` stays empty in local storage, so `useIsOwner` reports "not an owner" and `/admin` shows "Access denied". This affects every authenticated user, not just Hugo — the existing owner only works because their first login happened before the policy that references `has_role` existed (or under a different role grant).

The earlier `AuthContext` / `useIsOwner` changes were chasing the symptom — the network call literally never returns the role row, so client-side gating cannot help.

## Fix

Single SQL migration:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
```

Also audit the other SECURITY DEFINER helpers used inside RLS (`is_game_member`, `is_game_host`, `is_host_of_player`, `is_host_of_character`) and grant EXECUTE to `authenticated` for any that are missing it, to prevent the same failure mode on `games` / `game_players` / `characters` reads.

## Verification

1. Re-run the failing request as Hugo — should return `[{ user_id, role: "owner" }, { user_id, role: "game_master" }]` with 200.
2. Sign in as `hugo@garcia-cotte.com`, navigate to `/admin` — Admin dashboard renders.
3. Sign in as a non-owner account — `/admin` shows "Access denied" (policy works, just returns nothing).
4. Confirm normal game flows still work for a non-owner (regression check for the other helpers).

## Notes

- No client code changes needed. The defensive `syncReady` reset added previously to `AuthContext` is still correct and can stay.
- This is a pure permission grant; no data is modified.
