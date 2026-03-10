

## Diagnosis

The "Loading quest..." screen happens because you're still running the **previous version** of the code. The old code had `if (isGuest || !online)` which always forced guests into the local-only path. The game was cached with a temp UUID, but HostGame's queries (which weren't disabled for guests in the old code) tried to fetch that temp UUID from the database and failed.

The new code we just deployed should fix this — anonymous guests now have real database sessions, so game creation goes through the normal DB insert path and HostGame can query it back.

## Remaining Issue

There is one gap: if the online DB insert fails (network blip, RLS issue), the guest gets an error toast but no game is created at all. We should add a **fallback to local creation** when the DB insert fails, same as the offline path. This makes the flow resilient.

### Change: `src/pages/Dashboard.tsx` — Add fallback in `handleCreateGame`

In the online DB insert error handler (around line 176), instead of just showing an error toast and returning, fall through to the same local game creation + cache seeding logic used by the offline branch.

```text
handleCreateGame flow:
  online? → try DB insert
    success? → navigate to /game/{id}/host  ✓
    fail?   → fallback: create local game + cache + navigate  (NEW)
  offline? → create local game + cache + navigate  ✓
```

This is a small change — extract the local-creation block into a helper function and call it from both the offline branch and the error branch.

