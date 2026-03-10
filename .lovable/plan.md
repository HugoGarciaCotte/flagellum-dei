

## Fix: Guest/offline game creation — no join code, fully local

**Insight**: Join codes only make sense for online multiplayer via the database. Guest and offline games are local-only, so generating a join code is misleading.

### Changes in `src/pages/Dashboard.tsx` → `handleCreateGame`

Add a guest check block before the online path (similar to the existing offline block):

```ts
if (isGuest || !online) {
  const tempGameId = crypto.randomUUID();
  const newGame = {
    id: tempGameId,
    host_user_id: user!.id,
    scenario_id: scenarioId,
    join_code: null,        // No join code for local games
    status: "active",
    current_section: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Cache locally for offline/guest persistence
  const cacheKey = `my-games-${user!.id}`;
  const cached = getCacheData<any[]>(cacheKey) ?? [];
  setCacheData(cacheKey, [newGame, ...cached]);
  queryClient.setQueryData(["my-games", user!.id], (old: any[]) =>
    old ? [newGame, ...old] : [newGame]
  );
  toast({ title: "Game created", description: "Local game — no join code needed." });
  navigate(`/game/${tempGameId}/host`);
  return;
}
```

This consolidates the existing offline block and adds guest support. The old offline-only block (which generated `"OFFLINE"` as a join code and queued a DB action) gets replaced — guests and offline users shouldn't queue DB writes either.

### UI adjustment in Active Games cards

The join code display (`Code: XXXX`) should handle `null` gracefully — hide or show "Local game" instead.

### No changes needed in HostGame/PlayGame

Those pages already fall back to cached session data when the DB query returns nothing.

