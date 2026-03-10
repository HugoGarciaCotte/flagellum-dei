

## Hardcode scenarios into source code

### Goal
Move all 9 scenarios from the database into the codebase so they ship with the app bundle, work offline by default, and become part of the open-source repository.

### Current state
- 9 scenarios in the `scenarios` table (25–72 KB of MediaWiki content each, ~335 KB total)
- The `games` table has a `scenario_id` FK pointing to `scenarios`
- Client code fetches scenarios via Supabase queries in 5 places (Home, Dashboard, HostGame, PlayGame, ManageScenarios)
- An admin UI imports/edits/deletes scenarios and syncs from the wiki

### Approach

**Keep the `scenarios` DB table and its data untouched.** Existing games have `scenario_id` FKs pointing to it. Removing the table would break those references. Instead, the client simply stops reading from it.

#### 1. Create hardcoded scenario data files

- `src/data/scenarios/index.ts` — exports `getAllScenarios()` and `getScenarioById(id)` 
- One `.ts` file per scenario (e.g. `danse-macabre-1.ts`) exporting `{ id, title, description, level, content }`
- Use the **existing UUIDs** from the database so lookups by `scenario_id` in games still resolve

#### 2. Replace all client-side scenario queries

| File | Current | New |
|---|---|---|
| `Home.tsx` | `supabase.from("scenarios").select(...)` | `getAllScenarios()` — synchronous, no query needed |
| `Dashboard.tsx` | `supabase.from("scenarios").select("*")` | `getAllScenarios()` — drop the query entirely |
| `HostGame.tsx` | `games` query joins `scenarios(title, description, content)` | Fetch game only (no join), then `getScenarioById(game.scenario_id)` |
| `PlayGame.tsx` | `games` query joins `scenarios(title, level)` | Same pattern — fetch game, look up scenario locally |
| `Dashboard.tsx` (game lists) | `games` query joins `scenarios(title)` | Same pattern |

#### 3. Remove offline scenario caching (no longer needed)

- Delete `useOfflineScenarios` hook (scenarios are always in the bundle)
- Remove `cacheScenarios` / `getCachedScenarios` / `getCachedScenarioById` from `offlineStorage.ts`
- Remove the `SCENARIOS_KEY` constant
- Remove `useOfflineScenarios()` call from Dashboard

#### 4. Gray out admin scenario controls

- **Admin.tsx**: Disable the "Check for Updates" button and add a note like "Scenarios are now part of the source code"
- **ManageScenarios.tsx**: Disable create/edit/delete/regenerate buttons; show a read-only list with a note explaining scenarios are hardcoded

#### 5. Files changed (summary)

| Action | Files |
|---|---|
| **Create** | `src/data/scenarios/index.ts`, plus 9 individual scenario files |
| **Edit** | `Home.tsx`, `Dashboard.tsx`, `HostGame.tsx`, `PlayGame.tsx`, `Admin.tsx`, `ManageScenarios.tsx`, `offlineStorage.ts` |
| **Delete** | `useOfflineScenarios.ts` |

Total content is ~335 KB of wikitext embedded in TypeScript string literals. This compresses well in the production bundle (gzip).

