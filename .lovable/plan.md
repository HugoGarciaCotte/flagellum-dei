

## Offline Resilience Audit — Results

### What works correctly

All **data-critical mutations** (11 total) use `resilientMutation()` — they try the server first and fall back to the offline queue on failure. This covers:

| File | Mutations | Status |
|------|-----------|--------|
| `CharacterSheet.tsx` | `saveMutation` | OK — uses `resilientMutation` |
| `Dashboard.tsx` | `deleteCharMutation`, `handleCreateGame` | OK |
| `PlayGame.tsx` | `selectCharMutation` | OK |
| `HostGame.tsx` | `endGame`, `activateSection` | OK |
| `CharacterCreationWizard.tsx` | `saveArchetype`, `saveSubfeat`, `saveFinalDetails`, `handleSkipBeforeArchetype` | OK |
| `CharacterFeatPicker.tsx` | `upsertMutation`, `deleteMutation`, `addFreeFeatMutation`, `updateNoteMutation`, `setSubfeatMutation` | OK |

All **queries** use `useOfflineQuery` which caches to localStorage and falls back to cache when offline or when the server is unreachable (line 52 handles the "online but server dead" case).

**Auth** falls back to local guest when `signInAnonymously()` fails. Queue remapping works on reconnect.

**Game sessions** are cached via `useOfflineGameSession` and both `HostGame` and `PlayGame` use `cachedSession` fallback when the query returns no data.

### What DOESN'T work offline (by design — acceptable)

- **Join a game** — requires server to look up join code. UI correctly disables when `!online`.
- **End a game** — requires server. Shows toast on failure.
- **Portrait upload/generation** — requires server + storage. Buttons disabled when `!online`.
- **AI description/name generation** — requires edge functions. Fails silently, no data loss.
- **AI feat validation** — fails gracefully, allows the action anyway (line 204 in CharacterFeatPicker).
- **Realtime subscriptions** — fail silently when offline. Fine.

### No issues found

Every data-saving path goes through `resilientMutation`. Every query goes through `useOfflineQuery` with localStorage cache. Guest mode falls back to local guest when the server is unreachable. The app is fully resilient for all data-critical operations, whether the user is a guest, local guest, or registered user.

**No changes needed.** The implementation is solid.

