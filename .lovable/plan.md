## Goal

Expose all game content (feats + scenarios) through a public, unauthenticated, read-only API, and document it in the admin panel.

## Approach

Add two public edge functions (`verify_jwt = false`) that return the same merged content the app uses internally (hardcoded data + DB overrides + localization). No DB schema changes — feats/scenarios already live in `src/data` and overrides in existing tables.

## Endpoints

Base: `https://bcisbkompyqtfrtzccit.supabase.co/functions/v1/`

1. `GET public-feats`
   - Query params: `locale=en|fr` (optional), `id=<uuid>` (optional, single feat)
   - Returns: `{ feats: Feat[], redirects: FeatRedirect[] }` or single feat object
2. `GET public-scenarios`
   - Query params: `locale=en|fr` (optional), `id=<uuid>` (optional, single scenario)
   - Returns: `{ scenarios: Scenario[] }` or single scenario object

Both:
- CORS open (`*`)
- Cache headers (`Cache-Control: public, max-age=300`)
- No `Authorization` header required
- Read-only (HEAD/GET only; other methods → 405)

## Implementation details

- New folder `supabase/functions/public-feats/index.ts` — imports the same JSON used by the app (copy `feats-data.json` into the function, or fetch via a shared bundling step). Apply `feat_overrides` from DB with service role, then localize.
- New folder `supabase/functions/public-scenarios/index.ts` — embeds the hardcoded scenarios array, merges `scenario_overrides` table, localizes.
- Update `supabase/config.toml`: add `[functions.public-feats] verify_jwt = false` and `[functions.public-scenarios] verify_jwt = false`.
- Since edge functions can't import `src/data` directly, ship the JSON/TS as sibling files inside each function folder. For scenarios (currently a TS module with ~30 large string consts), generate a JSON snapshot once via a small `scripts/export-scenarios.ts` and commit it next to the function.

## Admin docs

Add a new "Public API" card on `src/pages/Admin.tsx` (alongside Scenarios/Feats/Translations). Clicking opens a new page `src/pages/AdminApiDocs.tsx` showing:

- Plain-English intro: "Anyone can read the game's feats and scenarios. No login required."
- Each endpoint with: URL, method, query params, sample `curl`, sample JSON response shape.
- Note on caching and rate limits.
- Note that write operations are not exposed.

Wire route `/admin/api` in `src/App.tsx`, gated by `useIsOwner` like the other admin routes.

## Out of scope

- No changes to RLS or tables.
- No new dependencies.
- No write/mutate endpoints.
- Characters, games, profiles, and user data remain private.
