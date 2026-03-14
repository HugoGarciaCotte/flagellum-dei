

## Investigation Result

Game VAPYXK uses scenario `b830f194-9f41-4632-b628-9bae1e552780` ("Danse Macabre Chapter 1") with `current_section: "teaser"`. The Teaser section has a `background_image` metadata tag set in the DB override content.

**Root cause**: `PlayGame.tsx` calls `getScenarioById()` during render, which uses `getCachedScenarioOverrides()`. But overrides are loaded asynchronously at app startup (`App.tsx` line 29) and may not be cached yet when the component first renders. Since the hardcoded scenario has `content: null`, `scenarioContent` becomes `""`, `parseWikitext("")` returns no sections, and no background is ever shown. There is no re-render trigger when overrides finish loading.

## Fix

### `src/pages/PlayGame.tsx`

Add a state + effect to ensure `effectiveScenario` updates after overrides load:

1. Import `loadScenarioOverrides` from `@/lib/scenarioOverrides`
2. Add a `scenarioReady` state flag, initially `false`
3. Add a `useEffect` that calls `await loadScenarioOverrides()` then sets `scenarioReady` to `true`
4. Make `effectiveScenario` depend on `scenarioReady` so it re-evaluates after overrides are cached

This is a minimal change — just ensuring the component re-renders once overrides are available.

### File changed
- `src/pages/PlayGame.tsx`

