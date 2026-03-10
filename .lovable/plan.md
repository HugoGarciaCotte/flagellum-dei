

## Offline Logic Audit — Issues Found

After reviewing all offline-related code across the codebase, here are the issues categorized by severity:

### Critical Issues

**1. HostGame.tsx uses raw `useQuery` instead of `useOfflineQuery`**
The host game page fetches `game`, `players`, and `characters` with plain `useQuery` and manual `enabled: !effectivelyOffline` guards. This means if the page is loaded while online and then goes offline, there's no localStorage cache to fall back on if React Query's in-memory cache is cleared (e.g., page refresh while offline). PlayGame.tsx correctly uses `useOfflineQuery` for its queries.

Fix: Switch HostGame's three queries to `useOfflineQuery` with appropriate cache keys, matching the pattern in PlayGame.tsx. Remove the manual `effectivelyOffline` guards on `enabled`/`retry` since `useOfflineQuery` handles that.

**2. `useIsGameMaster` doesn't handle offline for non-guest users**
The hook queries `user_roles` from the database but has no offline fallback. If a GM loses connection, the query will fail and `isGameMaster` returns `false`, hiding the "Host a Game" section and potentially breaking navigation. Guest GM status is fine (uses localStorage).

Fix: Wrap with `useOfflineQuery` or cache the result in localStorage so the GM role persists offline.

### Moderate Issues

**3. `useOfflineQuery` doesn't disable the query when offline if `enabled` is explicitly passed as `true`**
Looking at the hook: `enabled: effectivelyOffline ? false : (options.enabled ?? true)`. This is correct — it does disable when offline. However, when going from online→offline mid-session, the query won't refetch (good) but won't serve cached data from localStorage either, because `query.data` would still be defined from the in-memory cache. This is actually fine for the common case. No fix needed.

**4. CharacterSheet portrait upload/generate silently fails offline**
Upload and Generate buttons are correctly disabled when offline, and there's a helpful message. No issue here.

**5. DiceRoller broadcast channel offline behavior**
The Supabase realtime channel will silently fail when offline. The local dice roll animation still works. Broadcast will resume when online. This is acceptable behavior — no fix needed.

**6. `useIsOwner` hook — potential offline issue**
Need to verify this doesn't break offline.

**7. GuestBanner z-index vs OfflineBanner z-index**
GuestBanner is z-30, OfflineBanner is z-50. When both show (guest + offline), the offline banner sits on top at bottom-0, but the guest banner is also at bottom-0. They overlap. The guest banner would be hidden behind the offline banner.

Fix: When offline, the guest banner should shift up (e.g., `bottom-10` when offline banner is visible), or the offline banner should account for it.

### Summary of Changes

| File | Change |
|------|--------|
| `src/pages/HostGame.tsx` | Switch 3 queries from `useQuery` to `useOfflineQuery` |
| `src/hooks/useIsGameMaster.ts` | Add localStorage caching for non-guest GM role |
| `src/components/GuestBanner.tsx` | Shift up when offline banner is visible |

### No Issues Found In
- `offlineQueue.ts` — queue management, temp ID remapping, auto-sync all solid
- `offlineStorage.ts` — game session caching works correctly
- `useOfflineQuery.ts` — hook logic is sound
- `useNetworkStatus.ts` — simple and correct
- `OfflineBanner.tsx` — queue count tracking and sync states work
- `CharacterCreationWizard.tsx` — all 3 save stages handle offline with temp IDs and optimistic updates
- `CharacterFeatPicker.tsx` — all mutations (upsert, delete, free feat, subfeat, notes) handle offline
- `CharacterSheet.tsx` — save mutation handles offline; upload/generate correctly disabled
- `Dashboard.tsx` — character deletion, game creation, join-game-offline-block all correct
- `PlayGame.tsx` — uses `useOfflineQuery`, character selection handles offline
- `DiceRoller.tsx` — works locally offline, broadcast degrades gracefully
- `App.tsx` — query client retry disabled when offline, auto-sync listener attached
- Service worker / PWA config — assets precached

