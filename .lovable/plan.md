# Fix "No content available" on host page

## Root cause

The game `dbe43b61-…` points to scenario `a2b3c4d5-e6f7-4890-ab12-cd34ef56ab78`, which exists in `src/data/scenarios.ts`. The DB row is correct and there are no `scenario_overrides` for it.

The host page (`src/pages/HostGame.tsx:60`) does:

```ts
const effectiveScenario = game ? getScenarioById(game.scenario_id, locale) : null;
```

`game` comes from the local-first store (`useLocalRow("games", gameId)`), not directly from the DB. If the locally-cached row was written before the scenario-id alias fix (e.g. `…cd34ef56gh78`, which is not even valid hex), `game.scenario_id` is a legacy id.

`getScenarioById` in `src/data/scenarios.ts` does a strict `hardcodedScenarios.find(s => s.id === id)`. It does **not** apply `normalizeScenarioId`. Result → `undefined`, `scenarioContent = ""`, no sections parsed, so the page renders `t("game.noContent")` ("No content available.").

`normalizeScenarioId` is currently only applied in the push path (`syncManager.ts`) and in `retryPublish`, so the DB has the canonical id but the locally cached `games` row can still hold the legacy alias until it gets overwritten by a pull.

## Fix

Apply `normalizeScenarioId` inside the scenario lookup so legacy ids resolve transparently.

### `src/data/scenarios.ts`

- Import `normalizeScenarioId` from `@/lib/scenarioIds`.
- In `getScenarioById`, normalize the incoming id before `find`:
  ```ts
  const normalized = normalizeScenarioId(id) ?? id;
  const scenario = hardcodedScenarios.find(s => s.id === normalized);
  ```

That's it — one targeted change. The push path already canonicalizes, the local cache will heal on the next pull, and meanwhile the host/play/dashboard screens will resolve the scenario correctly.

## Out of scope

- No changes to RLS, schema, or sync logic.
- No bulk rewrite of locally cached `games` rows (the normalized lookup makes it unnecessary).
- No UI changes.

## Verification

After the change, reload `/game/dbe43b61-…/host`: scenario "Chapter 4 - Danse Macabre" should render with its sections instead of "No content available."
