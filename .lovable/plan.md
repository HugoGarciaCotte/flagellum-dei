

## Fix: Playlist & Queue Track Metadata Not Showing in Host Game

### Problem
The scenario content in the database **does** contain the `<!--@ playlist: ... @-->` and `<!--@ queue_track: ... @-->` metadata tags you added. However, `HostGame.tsx` doesn't wait for the database overrides to load before rendering the scenario. It calls `getScenarioById()` immediately, which returns the **hardcoded** scenario content (without your metadata).

`PlayGame.tsx` already handles this correctly — it calls `loadScenarioOverrides()` and waits via a `scenarioReady` state before using the scenario data.

### Fix — `src/pages/HostGame.tsx`

1. Import `loadScenarioOverrides` from `@/lib/scenarioOverrides`
2. Add a `scenarioReady` state, initialized to `false`
3. Add a `useEffect` that calls `loadScenarioOverrides().then(() => setScenarioReady(true))`
4. Include `scenarioReady` in the dependency list of the `effectiveScenario` memo so it re-evaluates after overrides load
5. Show the loader until both `syncReady` and `scenarioReady` are true

This mirrors the existing pattern in `PlayGame.tsx` — a one-line addition plus a state variable.

### Result
Once overrides are loaded, the parsed wikitext will contain the correct `playlist` and `queue_track` metadata, and `WikiSectionTree` will render the playlist links and queue track buttons as expected.

