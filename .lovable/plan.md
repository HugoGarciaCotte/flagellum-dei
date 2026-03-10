

## Offline Resilience Audit — Confirmed Solid

### All mutation paths verified

Every single `supabase.from()` **write** call across all 5 component/page files is wrapped in `resilientMutation()`. If the server is dead, the offline callback runs: it queues the action to localStorage, optimistically updates the React Query cache and the localStorage cache, and shows the user appropriate feedback.

### Query paths verified

All data fetching uses `useOfflineQuery`, which:
- Caches every successful response to `localStorage`
- Returns cached data when offline, syncing, or local guest
- Falls back to cache even when "online" but the server is unreachable (the `isError` branch)

### Non-critical features that require the server (by design)

| Feature | Behavior when server is dead |
|---------|------------------------------|
| Join a game | UI disabled, toast explains why |
| End a game | Toast: "Server unreachable" |
| Portrait upload/generate | Buttons disabled; wizard allows local blob URL fallback |
| AI name/description generation | Fails silently, no data loss |
| AI feat validation | Catches error, allows the action anyway |
| Realtime subscriptions | Fail silently, no crash |
| Dice broadcast | Fails silently, local roll still works |

### Auth when server is dead

- `signInAnonymously()` fails → falls back to **local guest** with a temporary UUID
- All mutations use that temp UUID
- On reconnect, `remapUserId()` replaces the temp UUID with the real one across all queued actions before draining

### Conclusion

**No gaps found.** Every data-saving path goes through `resilientMutation`. Every query goes through `useOfflineQuery` with localStorage cache. Guest auth gracefully degrades. The game is fully playable offline for all core features (character creation, editing, feat management, section navigation, dice rolling). No code changes needed.

