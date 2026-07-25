## Finding
The active game is on Chapter 6 and the current section is `intro-archivum-secretum-apostolicum-avenionensium`.

The background URL itself loads successfully, and `scenario_overrides` is publicly readable. The issue is an ID mismatch:

- The game/override row uses legacy scenario ID `f6a7b8c9-d0e1-4f23-4567-89abcdef0123`.
- The app normalizes that to canonical ID `f6a7b8c9-d0e1-4f23-8567-89abcdef0123` before looking up the scenario.
- `getScenarioById()` then applies overrides only by canonical ID, so the live edited content containing the background is skipped.
- Result: players fall back to the bundled Chapter 6 content, which has no intro `background_image`, so the play screen background is empty.

## Plan
1. Update `src/lib/scenarioOverrides.ts` so loaded overrides are stored under both their raw scenario ID and normalized scenario ID.
2. Also make `applyScenarioOverrides()` check the normalized scenario ID as a fallback, so old DB rows and canonical app IDs both work.
3. Verify the active Chapter 6 scenario resolves with the edited intro `background_image` after overrides load.

## Why this is the safest fix
- No database rewrite needed during your live game.
- It fixes this Chapter 6 game immediately and prevents the same bug for other legacy scenario IDs.
- It keeps the existing local-first/offline flow unchanged.