

## Offline-first: characters, feats, and GM scenario launching

### Current state

- **HostGame**: Already works offline (cached session, local section navigation, queued updates)
- **PlayGame**: Partially offline (cached game session fallback, but character selection/creation requires DB)
- **Dashboard**: Fully online-dependent (character list, game list, create/join/host all hit Supabase)
- **CharacterSheet**: All saves go directly to Supabase (name, description, portrait upload/generate)
- **CharacterCreationWizard**: Every step writes to Supabase immediately (progressive save pattern)
- **CharacterFeatPicker**: All feat assignments (upsert, delete, subfeat, free feat, notes) are Supabase mutations

### Approach: Offline queue + localStorage cache

Create a centralized offline queue system. When offline, mutations are saved to localStorage and replayed when connectivity returns. A persistent banner shows "Changes saved locally — will sync when back online."

### New infrastructure

**`src/lib/offlineQueue.ts`** — Core offline queue
- `queueOfflineAction(action)`: Stores a pending mutation (table, operation, payload) in localStorage
- `getQueuedActions()`: Returns all pending actions
- `processQueue()`: Replays queued actions against Supabase, removes successful ones
- `getQueueLength()`: For badge/banner display
- Auto-processes on `online` event

**`src/hooks/useOfflineQuery.ts`** — Wrapper for queries with localStorage fallback
- Wraps `useQuery` to cache results in localStorage on success
- When offline and query fails, returns cached data
- Used for: `my-characters`, `character-feats`, `character-feat-subfeats`, `my-games`, `joined-games`, `character` (single)

**`src/hooks/useOfflineMutation.ts`** — Wrapper for mutations with queue fallback
- When online: normal Supabase mutation
- When offline: generates a temporary UUID, saves to localStorage cache + queues the action for later sync
- Optimistically updates the local query cache so the UI reflects changes immediately

### Update `OfflineBanner.tsx`
- Show queue count: "You're offline — 3 changes saved locally"
- On reconnect, show "Syncing..." then "All changes synced" briefly

### File changes

**`CharacterSheet.tsx`**
- Save name/description: queue offline, update local cache optimistically
- Portrait upload: disabled when offline (needs network), show disabled state
- Portrait generate: disabled when offline (needs AI), show disabled state
- Character fetch: use cached fallback from localStorage

**`CharacterCreationWizard.tsx`**
- When offline: generate temporary character ID locally (`crypto.randomUUID()`)
- Save archetype, subfeats, final details all to localStorage
- Queue all inserts/updates for sync
- AI generation buttons (description, name, portrait): hidden or disabled when offline with note "Available when online"
- Skip button still works (creates local-only character)

**`CharacterFeatPicker.tsx`**
- All mutations (upsert, delete, addFree, setSubfeat, updateNote): queue offline
- AI validation (`validate-feat`): already skips when offline — no change needed
- Character feats query: use cached fallback

**`CreateCharacterForm.tsx`**
- Queue insert offline, generate temp ID, update local character list cache

**`Dashboard.tsx`**
- Character list: cached fallback when offline
- Delete character: queue offline
- Game list: cached fallback
- Join game: disabled when offline (needs network to validate code), show message
- Host game: **allowed offline** — generates a local game with temp ID, no join code. Banner says "Game created locally — join code will be generated when back online"

**`PlayGame.tsx`**
- Character selection mutation: queue offline
- Character creation: use offline wizard flow

**`HostGame.tsx`**
- Already mostly works offline. Add: if game was created offline (no DB row yet), run entirely from local state.

### Queue action shape

```typescript
interface QueuedAction {
  id: string;
  timestamp: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
  tempId?: string; // for inserts, to remap after sync
  filter?: Record<string, any>; // for update/delete WHERE clause
}
```

### Sync strategy

When coming back online:
1. Process queue in order (FIFO)
2. For inserts with temp IDs: after getting real ID, update all subsequent queued actions that reference the temp ID
3. Invalidate all queries after full sync to refresh from server
4. Clear localStorage caches for synced data

### What stays online-only

- AI features: portrait generation, description generation, name generation, feat validation (already handled)
- Portrait upload (needs storage API)
- Join game (needs to validate code against DB)
- Sign out / sign in (needs auth)
- Admin pages (read-only viewer, no urgency)

### Files summary

| Action | Files |
|---|---|
| **Create** | `src/lib/offlineQueue.ts`, `src/hooks/useOfflineQuery.ts`, `src/hooks/useOfflineMutation.ts` |
| **Edit** | `OfflineBanner.tsx`, `CharacterSheet.tsx`, `CharacterCreationWizard.tsx`, `CharacterFeatPicker.tsx`, `CreateCharacterForm.tsx`, `Dashboard.tsx`, `PlayGame.tsx`, `HostGame.tsx`, `offlineStorage.ts` |

