

## Why the new texts aren't showing

The `Home` component has this logic:

```tsx
const allScenarios = getAllScenarios(); // from src/data/scenarios.ts
const displayScenarios =
    allScenarios.length > 0 ? allScenarios : showcaseScenarios;
```

Since `scenarios.ts` contains existing scenario data (e.g. "Danse Macabre Part 1/2/3"), `allScenarios` is non-empty, so the updated `showcaseScenarios` array is **never used**. The page always renders the old `scenarios.ts` data.

## Fix

Change line 162-163 to always use the hardcoded `showcaseScenarios` for the landing page showcase section, since those are the curated marketing descriptions (separate from the actual game scenario data):

```tsx
const displayScenarios = showcaseScenarios;
```

This is a one-line change in `src/pages/Home.tsx`.

