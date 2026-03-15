

## Shareable join URL + `/join/:code` route

### What changes

1. **New route `/join/:code`** — a small page that:
   - If user is logged in (or guest): looks up the game by `join_code`, inserts into `game_players`, redirects to `/game/:id/play`
   - If not logged in: redirects to `/auth?redirect=/join/:code`, so after login/guest-enter they land back and auto-join

2. **New page `src/pages/JoinGame.tsx`** — handles the lookup + join + redirect logic (reuses the same join logic currently in `Dashboard.handleJoinGame`)

3. **`src/App.tsx`** — add `<Route path="/join/:code" element={<JoinGame />} />`

4. **`src/pages/Auth.tsx`** — respect `?redirect=` query param: after successful login/signup/guest-enter, navigate to the redirect URL instead of `/`

5. **Copy button changes** — in `HostGame.tsx` and `PlayGame.tsx`:
   - `copyCode()` now copies the full URL: `${window.location.origin}/join/${game.join_code}`
   - The button still **displays** only the join code (e.g. `AB12XY`)

6. **`src/i18n/en.ts` + `fr.ts`** — add keys for "Joining game..." loader text and any toast messages

### Technical details

**`JoinGame.tsx` logic:**
```
const { code } = useParams();
const { user, loading } = useAuth();

// If not logged in → redirect to /auth?redirect=/join/{code}
// If logged in → lookup game by join_code, insert game_player, redirect to /game/{id}/play
// Show FullPageLoader while processing
```

**Auth redirect flow:**
- Read `redirect` from `useSearchParams`
- After successful auth, `navigate(redirect || "/")`
- Guest mode (`enterGuestMode`) also respects the redirect

**Copy in HostGame/PlayGame:**
```typescript
navigator.clipboard.writeText(`${window.location.origin}/join/${game.join_code}`);
```

