

## Audit: Guest Mode (Online + Offline) — No Bugs Found

After reading through every relevant file in detail, the guest mode implementation is correct across all flows.

### What was checked

| Area | Online Guest | Local Guest (Offline) | Status |
|------|-------------|----------------------|--------|
| **Auth flow** | `signInAnonymously()` → real session | Fake UUID stored in localStorage | Correct |
| **Sync gate** | `syncReady` set after queue drain | `syncReady` set immediately (no queue to drain) | Correct |
| **useOfflineQuery** | `canFetch` blocks local guests from server queries; cache fallback includes `isLocalGuest` | Same — returns cached data only | Correct |
| **Dashboard — characters** | Fetches from DB with real `auth.uid()` | Returns cached data via `useOfflineQuery` | Correct |
| **Dashboard — create character** | Saves to DB | `CharacterCreationWizard` queues with temp IDs + seeds caches | Correct |
| **Dashboard — delete character** | Deletes from DB | Queues delete + optimistic cache update | Correct |
| **Dashboard — host game** | Creates in DB with join code | `createLocalGame()` — local cache + `cacheGameSession` | Correct |
| **Dashboard — join game** | Joins via DB | Blocked with toast "You need to be online" | Correct |
| **HostGame** | Fetches game/players/characters via `useOfflineQuery` | Falls back to `getCachedGameSession` | Correct |
| **HostGame — section navigation** | Updates DB + local state | Updates local state + `updateCachedSection` | Correct |
| **HostGame — end game** | Updates DB | Blocked with "Cannot end game while offline" toast | Correct |
| **PlayGame** | Fetches game/player/characters | Falls back to cached session | Correct |
| **PlayGame — select character** | Updates DB | Queues update + optimistic cache | Correct |
| **PlayGame — create character** | `CharacterCreationWizard` with `gameId` | Full offline flow with temp IDs | Correct |
| **CharacterSheet — save** | Updates DB | Queues update + optimistic cache | Correct |
| **CharacterSheet — upload/generate** | Works (requires network) | Upload requires network (will fail gracefully); generate requires network | Correct |
| **CharacterFeatPicker — all mutations** | Uses DB directly | All 5 mutations (upsert, delete, addFree, updateNote, setSubfeat) queue offline with optimistic updates | Correct |
| **CharacterFeatPicker — AI validation** | Calls edge function | Skipped offline, feat allowed directly | Correct |
| **DiceRoller** | Broadcasts via Supabase channel | Local rolling works, broadcast fails silently | Correct |
| **GameTimer** | Pure client-side | No server dependency | Correct |
| **useIsOwner** | Queries DB, returns `false` for guests | `enabled: !isGuest` prevents query; returns `false` | Correct |
| **useIsGameMaster** | Queries DB for real guests | Falls back to `localStorage` for guests | Correct |
| **GuestBanner** | Shows for `isGuest` (covers both types) | Same | Correct |
| **OfflineBanner** | Shows sync/degraded states | Shows offline + queue count | Correct |
| **Auth page — signup** | Real anonymous → `updateUser` conversion | Local guest → standard `signUp` (can't convert fake UUID) | Correct |
| **processQueue concurrency** | `_isSyncing` guard prevents double-processing | Same | Correct |
| **Realtime subscriptions** | Work normally | Fail silently (no crash) | Correct |

### Summary

No bugs found. The guest mode works correctly in all scenarios:

1. **Online guest (real anonymous session):** Full DB access via `auth.uid()`, all CRUD works, can be converted to permanent account.
2. **Local guest (offline fallback):** All mutations queued with temp IDs, all queries served from cache, upgrade attempted on reconnect with UUID remapping.
3. **Online guest going offline mid-session:** Mutations switch to queue, queries return cached data, sync gate handles reconnection.

The implementation is solid.

