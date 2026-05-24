## What I found

- The browser test is not logged in, so I cannot visually see your private GM view in the preview session.
- The database does contain hosted games for your account, and several past players with characters:
  - Sheethal: 1 character
  - Chen: 1 character
  - King Wattus: 1 character
  - Guest: 1 character
  - Hugo: 5 characters
- The app is still likely hiding them because the sync uses `updated_at >= lastSync` for hosted games. Since many hosted games were ended/updated before the latest sync timestamp, the incremental pull returns no hosted games, so `GMPlayerList` has no hosted game IDs to match against.

## Fix plan

1. Update `src/lib/syncManager.ts` so hosted games are always full-pulled for the current GM, not filtered by `lastSync`.
   - Keep played games incremental/active-only as currently intended.
   - This ensures ended hosted games are reintroduced into local storage even after a later sync timestamp.

2. Make the player-character pull robust for historical players.
   - Continue using all hosted game IDs to pull `game_players`.
   - Pull other users' characters without `updated_at` filtering, as already started.
   - Exclude deleted characters from the My Players display so deleted rows do not count as valid characters.

3. Verify after implementation.
   - Check the relevant network requests no longer apply `updated_at=gte...` to hosted games.
   - Confirm the expected player rows/characters are available from backend data.
   - If the browser session remains logged out, report that visual verification requires you to be logged in in the preview first.