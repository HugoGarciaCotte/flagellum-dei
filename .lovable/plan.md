

## Guest Mode Audit — Confirmed Solid

### Three guest scenarios

| Scenario | Auth state | How mutations work | How queries work |
|----------|-----------|-------------------|-----------------|
| **Online guest** | Real anonymous session via `signInAnonymously()` | Server-first via `resilientMutation`, uses real `auth.uid()` | Normal `useOfflineQuery` fetches from server, caches to localStorage |
| **Offline guest (local)** | Temp UUID from `generateLocalGuestUser()`, `isLocalGuest=true` | All mutations fall to offline callback in `resilientMutation`, queued with temp UUID | `useOfflineQuery` disabled (`canFetch=false` when `isLocalGuest`), returns localStorage cache |
| **Reconnecting guest** | `initSync` upgrades local→real anonymous, `remapUserId()` fixes queue | Queue drains with real UUID before `syncReady=true` | Queries re-enable after `syncReady=true` |

### All mutation paths verified for guest mode

Every mutation uses `resilientMutation()` with an offline callback that:
1. Generates temp UUIDs for new records
2. Queues the action to localStorage
3. Optimistically updates both React Query cache AND localStorage cache

This works identically whether `user.id` is a real anonymous UUID or a local temp UUID.

**Verified in:**
- `CharacterCreationWizard.tsx`: `saveArchetype` (lines 169-246), `saveSubfeat` (lines 249-287), `saveFinalDetails` (lines 290-325), `handleSkipBeforeArchetype` (lines 386-429) — all create temp IDs and queue correctly
- `CharacterSheet.tsx`: `saveMutation` (lines 56-89) — queues update with filter
- `Dashboard.tsx`: `deleteCharMutation` (lines 60-81), `handleCreateGame` (lines 169-183) — falls back to `createLocalGame`
- `PlayGame.tsx`: `selectCharMutation` (lines 86-107) — queues game_player update
- `HostGame.tsx`: `activateSection` (lines 165-176) — updates local state first, queues server update

### Query behavior for local guests

`useOfflineQuery` sets `canFetch = false` when `isLocalGuest` is true (line 21). This means:
- No server requests are attempted (no auth token exists anyway)
- Data comes from localStorage cache or from React Query cache (set by optimistic updates)
- First-time local guests with no cache see empty arrays (characters list, games list) — correct behavior

### Edge cases verified

| Edge case | Behavior |
|-----------|----------|
| Local guest creates character offline | Temp UUID used, queued, cache updated — character appears in UI immediately |
| Local guest reconnects | `initSync` calls `signInAnonymously()`, `remapUserId()` fixes all queued temp UUIDs, queue drains, `syncReady` enables queries |
| Online guest server dies mid-session | `resilientMutation` catches the error, falls back to queue — no data loss |
| Guest converts to real account (signup) | Handled in `Auth.tsx` via `updateUser` — existing anonymous session preserved |
| Local guest hosts a game offline | `createLocalGame` runs (Dashboard line 139-167), creates cached game session with "LOCAL" join code |

### No issues found

Every data-saving path works with any user ID (real, anonymous, or temp local). Every query gracefully handles the `isLocalGuest` state. The `remapUserId` bridge correctly upgrades temp IDs on reconnection. **No code changes needed.**

