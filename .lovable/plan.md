

## Plan: Full Offline Support for Active Game Sessions

### Current State
- Scenarios are cached in localStorage on Dashboard mount (`useOfflineScenarios`)
- PWA service worker caches Supabase API responses (StaleWhileRevalidate for scenarios, NetworkFirst for others)
- No offline caching for: active game data, player characters, or game players
- HostGame and PlayGame always fetch from Supabase with no offline fallback
- No image caching strategy for scenario content images

### What Needs to Work Offline
Once a game session is opened (either as GM or player), all data needed to run/view that session should be available offline:
1. The game record (status, join_code, current_section)
2. The full scenario (title, description, content)
3. Player characters linked to the game
4. Game players list
5. Any images referenced in scenario wikitext

### Implementation

#### 1. Expand `src/lib/offlineStorage.ts`
Add caching functions for game sessions:
- `cacheGameSession(gameId, { game, scenario, players, characters })` — stores everything needed for a game session in localStorage under a key like `qs_game_{gameId}`
- `getCachedGameSession(gameId)` — retrieves the cached session
- `updateCachedSection(gameId, sectionId)` — updates just the current_section in the cached game (for GM offline use)

#### 2. Create `src/hooks/useOfflineGameSession.ts`
A hook that:
- Takes the fetched game, players, and characters data
- On every successful fetch, caches the full session via `cacheGameSession`
- Exposes a `getCached()` fallback for when queries fail due to offline

#### 3. Update `src/pages/HostGame.tsx`
- Add character fetching for all players in the game (join via `game_players.character_id` to `characters`)
- Wrap the game query with offline fallback: if the Supabase query fails and we're offline, return cached data
- Cache the full session data after every successful fetch
- Make `activateSection` work offline: update local state + cache immediately, queue the Supabase update for when back online
- Show characters in a players panel (or at minimum cache them)

#### 4. Update `src/pages/PlayGame.tsx`
- Same offline fallback pattern: try Supabase, fall back to cached session
- Cache session on successful fetch
- When offline, the player sees the last-known active section (realtime won't update, as expected)

#### 5. Cache scenario images for offline use
- Update `parseWikitext.ts` to also handle MediaWiki image syntax (`[[File:...]]`) — extract image URLs
- Create a utility `prefetchImages(urls)` that fetches images so the service worker caches them
- The existing PWA config already caches images via CacheFirst strategy — we just need to trigger the fetch so they enter the cache
- Alternatively, add a Workbox runtime caching rule for the Supabase storage URL pattern if images are stored there

#### 6. Update `vite.config.ts` PWA config
- Add a runtime caching rule for Supabase storage URLs (if scenario images are hosted there) so they're cached by the service worker

### Files to Create/Modify
| File | Action |
|---|---|
| `src/lib/offlineStorage.ts` | Expand with game session caching |
| `src/hooks/useOfflineGameSession.ts` | Create — offline fallback hook |
| `src/pages/HostGame.tsx` | Add offline fallback + cache on fetch + offline section updates |
| `src/pages/PlayGame.tsx` | Add offline fallback + cache on fetch |
| `src/lib/parseWikitext.ts` | Extract image URLs from wikitext for prefetching |
| `vite.config.ts` | Add storage URL caching rule if needed |

### What Won't Work Offline (as expected)
- Realtime sync between GM and players
- Joining new games
- Creating new games
- Player list updates

