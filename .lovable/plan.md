

## Fix: Guest cannot host a game — stuck on "Loading quest..."

**Problem**: `HostGame` uses raw `useQuery` (not `useOfflineQuery`) to fetch the game from the database. For guests, these queries fail silently (RLS). The offline fallback via `getCachedGameSession` is empty because nothing seeds it. Dashboard creates a local game object but only caches it under `my-games-${userId}`, not as a game session.

**Two changes needed:**

### 1. `src/pages/Dashboard.tsx` — Seed game session cache before navigating

In `handleCreateGame` guest/offline branch (around line 152), also call `cacheGameSession` so HostGame's fallback finds data:

```ts
import { cacheGameSession } from "@/lib/offlineStorage";

// After creating newGame, before navigate:
const scenario = getScenarioById(scenarioId);
cacheGameSession(tempGameId, {
  game: { id: tempGameId, status: "active", join_code: "LOCAL", current_section: null, host_user_id: user!.id, scenario_id: scenarioId },
  scenario: { title: scenario?.title ?? "", description: scenario?.description ?? null, content: scenario?.content ?? null },
  players: [],
  characters: [],
  cachedAt: Date.now(),
});
```

### 2. `src/pages/HostGame.tsx` — Disable queries for guests, improve fallback

- Import `useAuth`, get `isGuest`
- Add `const effectivelyOffline = !online || isGuest`
- Disable all 3 queries for guests: `enabled: !!gameId && !isGuest`, `retry: effectivelyOffline ? 0 : 3`
- For `effectiveScenario`, also try `getScenarioById` from the cached game's `scenario_id` so bundled scenario content loads even from cache

