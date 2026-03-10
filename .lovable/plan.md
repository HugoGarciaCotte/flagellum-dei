

## Offline Audit — Final Issues

After reviewing every file that makes database queries, here's what remains:

### Issues to Fix

**1. `useIsOwner` uses raw `useQuery` — no offline fallback**
(`src/hooks/useIsOwner.ts` line 8) — Uses plain `useQuery` to check the owner role. If the user refreshes while offline, the query fails and `isOwner` returns `false`. This controls access to admin pages. Should use `useOfflineQuery` with a cache key, same pattern as the fixed `useIsGameMaster`.

**2. `GMPlayerList` uses raw `useQuery` — no offline fallback**
(`src/components/GMPlayerList.tsx` line 25) — The GM player list on the Dashboard uses plain `useQuery`. If offline, the list disappears entirely. Should use `useOfflineQuery`.

**3. `CharacterListItem` uses raw `useQuery` — no offline fallback**
(`src/components/CharacterListItem.tsx` line 14) — Fetches character feats with plain `useQuery`. When offline, feat summaries vanish from character cards. Should use `useOfflineQuery` with a per-character cache key.

### Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useIsOwner.ts` | Switch to `useOfflineQuery` with cache key `qs_is_owner` |
| `src/components/GMPlayerList.tsx` | Switch to `useOfflineQuery` with cache key `gm-players-{userId}` |
| `src/components/CharacterListItem.tsx` | Switch to `useOfflineQuery` with cache key `char-feats-summary-{charId}` |

### Already Verified — No Issues
- HostGame.tsx — fixed last round, uses `useOfflineQuery` ✓
- PlayGame.tsx — uses `useOfflineQuery` ✓
- Dashboard.tsx — uses `useOfflineQuery` for characters, games ✓
- CharacterSheet.tsx — uses `useOfflineQuery` ✓
- CharacterFeatPicker.tsx — uses `useOfflineQuery` ✓
- CharacterCreationWizard.tsx — handles offline with `queueAction` ✓
- useIsGameMaster.ts — fixed last round ✓
- GuestBanner.tsx — fixed last round ✓
- OfflineBanner.tsx — works correctly ✓
- offlineQueue.ts — queue, sync, cache all solid ✓
- DiceRoller.tsx — degrades gracefully ✓

