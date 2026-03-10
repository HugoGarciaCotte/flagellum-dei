

## Local-First Architecture Refactor

### Goal
Make **every read and write operate on local data first**. A single sync manager handles bidirectional sync with the server when online. No component ever reads directly from Supabase — they all read from a local store.

### Architecture

```text
┌─────────────────────────────────────────────┐
│  Components (Dashboard, CharacterSheet...) │
│      read/write via localStore + hooks      │
└────────────────┬───────────────────────────┘
                 │
     ┌───────────▼───────────┐
     │   localStore.ts       │
     │  localStorage-backed  │
     │  tables:              │
     │  - characters         │
     │  - character_feats    │
     │  - character_feat_    │
     │    subfeats           │
     │  - games              │
     │  - game_players       │
     │  - profiles           │
     │  - user_roles         │
     └───────────┬───────────┘
                 │
     ┌───────────▼───────────┐
     │   syncManager.ts      │
     │  pull: server → local │
     │  push: local → server │
     │  runs on:             │
     │   - app start         │
     │   - reconnect         │
     │   - after mutations   │
     └───────────────────────┘
```

### New Files

**1. `src/lib/localStore.ts`** — Single localStorage-backed store for all tables
- `getTable<T>(table)` / `setTable(table, rows)` — get/set full table data
- `getRow(table, id)` / `upsertRow(table, row)` / `deleteRow(table, id)`
- `getBy(table, filter)` — filter rows by field values
- Each table stored as `ls_{table}` in localStorage
- All reads are synchronous from memory (loaded once on init)
- Writes update both in-memory cache and localStorage
- Emits events so React hooks can re-render

**2. `src/lib/syncManager.ts`** — Bidirectional sync
- `pullAll(userId)` — fetches ALL user data from server (characters, feats, subfeats, games, game_players, profiles, user_roles) in parallel, writes to localStore
- `pushAll(userId)` — uploads ALL local data to server via upsert, deletes server records not present locally
- `syncAll(userId)` — pull then push (or merge strategy: server wins on pull, then push local-only changes)
- Called on: app start (if online), `online` event, after any mutation (debounced)
- Replaces the current `offlineQueue.ts` entirely — no more per-action queue, just full table sync

**3. `src/hooks/useLocalData.ts`** — Replaces `useOfflineQuery`
- `useLocalTable<T>(table, filter?)` — returns reactive data from localStore
- Uses `useSyncExternalStore` or a simple `useState` + event listener pattern
- No React Query needed for data reads anymore (React Query only used for sync status)

### Changes to Existing Files

**Remove/simplify:**
- `src/lib/offlineQueue.ts` — remove entirely (replaced by syncManager)
- `src/hooks/useOfflineQuery.ts` — remove entirely (replaced by useLocalData)
- `src/lib/offlineStorage.ts` — remove (game session cache folded into localStore)
- `src/hooks/useOfflineGameSession.ts` — remove (localStore handles this)

**Update all components to use localStore reads + writes:**

| Component | Current pattern | New pattern |
|-----------|----------------|-------------|
| Dashboard | `useOfflineQuery` → supabase | `useLocalData("characters", {user_id})` |
| CharacterSheet | `useOfflineQuery` → supabase | `useLocalData("characters", {id})` |
| CharacterFeatPicker | `useOfflineQuery` → supabase | `useLocalData("character_feats", {character_id})` |
| CharacterListItem | `useOfflineQuery` → supabase | `useLocalData("character_feats", {character_id})` |
| CharacterCreationWizard | direct supabase inserts | `localStore.upsertRow()` + trigger sync |
| HostGame | `useOfflineQuery` → supabase | `useLocalData("games", {id})` |
| PlayGame | `useOfflineQuery` → supabase | `useLocalData("games", {id})` |
| GMPlayerList | `useOfflineQuery` → supabase | `useLocalData("game_players", ...)` |
| useIsGameMaster | `useOfflineQuery` → supabase | `useLocalData("user_roles", {user_id, role})` |
| useIsOwner | `useOfflineQuery` → supabase | `useLocalData("user_roles", {user_id, role})` |

**All mutations** (character create/update/delete, feat pick, game create, etc.) will:
1. Write to `localStore` immediately
2. Update React state instantly
3. Call `syncManager.pushAll()` (debounced) in the background

**AuthContext** changes:
- After login/auth state change, call `syncManager.pullAll()` to populate local store
- Remove queue-related sync logic
- Keep `syncReady` flag — set to true after initial pull completes

**Realtime subscriptions** (HostGame, PlayGame):
- Keep Supabase realtime channels for multiplayer
- On realtime event: call `syncManager.pullAll()` (debounced) to refresh local store
- This replaces `queryClient.invalidateQueries()`

**App.tsx:**
- Remove `attachOnlineListener` — syncManager handles reconnect
- Remove React Query provider if no longer needed (or keep for sync status only)

### Sync Strategy

- **Pull**: Fetch all rows for the user from each table, replace local store entirely
- **Push**: For each table, upsert all local rows to server. Handle conflicts with "last write wins" using `updated_at`
- **Deletions**: Track deleted IDs in a `ls_deletions` list. On push, delete those from server. On pull, remove them from tracking.
- **Debounce**: Push is debounced (2s) so rapid mutations don't spam the server

### What stays online-only
- Game joining (needs server lookup by join code)
- Portrait upload/generation (needs storage + edge functions)
- AI validation (edge function)
- AI character generation (edge function)
- Realtime multiplayer broadcasting (dice rolls, section changes)

These stay wrapped in try/catch with "need to be online" messaging, same as today.

