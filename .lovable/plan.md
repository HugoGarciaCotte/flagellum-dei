

## Audit: Offline Game Play — 1 Bug Found

### Bug: Local guest + online = empty UI (no cache returned)

**Where:** `useOfflineQuery.ts` line 39

When a local guest is online (server was temporarily unreachable during `signInAnonymously`, then came back), the query is correctly disabled via `canFetch = false` (because `isLocalGuest` is true). However, the cache fallback on line 39 only triggers when:

```
effectivelyOffline || !syncReady || syncing
```

For a local guest who is **online**, all three are `false`:
- `effectivelyOffline` = false (browser reports online)
- `syncReady` = true (initSync completed)
- `syncing` = false

So the cache is never returned. The query has no data (`undefined`), and the component renders as if there's nothing — empty character lists, no games, blank screens.

**Fix:** Add `isLocalGuest` to the cache fallback condition on line 39:

```typescript
if (query.data === undefined && (effectivelyOffline || !syncReady || syncing || isLocalGuest)) {
```

This ensures local guests always see their cached data regardless of network state.

| File | Change |
|------|--------|
| `src/hooks/useOfflineQuery.ts` | Add `\|\| isLocalGuest` to the cache fallback condition on line 39 |

### Everything else is solid

- **HostGame offline:** `useOfflineQuery` caches game/players/characters. Scenarios are local data. Section navigation works with local state + cache update. End game blocked with clear message. Realtime subs fail silently.
- **PlayGame offline:** Same query caching. Character selection queues offline. Realtime updates fail silently. Shows "Offline — showing last known state."
- **Dashboard offline:** Character CRUD all queue correctly with optimistic updates. Game creation falls back to `createLocalGame`. Join game blocked with message.
- **CharacterSheet offline:** Save queues with optimistic cache update. Upload/generate disabled with message.
- **CharacterCreationWizard offline:** Full offline flow with temp IDs, queue actions, and cache seeding.
- **CharacterFeatPicker offline:** AI validation skipped, mutations queue correctly.
- **DiceRoller offline:** Broadcast fails silently, local rolling works.
- **GameTimer:** Pure client-side, no server dependency.
- **`useOfflineGameSession` hook:** Dead code for online games (checks `game.scenarios` which doesn't exist since scenarios moved to local data). Harmless — `useOfflineQuery` cache provides the same coverage. Not a bug, just unused code.

