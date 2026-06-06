/**
 * Syncs hardcoded game content into the public-api edge function folders.
 * Run whenever feats or scenarios change:
 *   bun run scripts/sync-public-api-data.ts
 */
import { writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Stub browser-only globals used transitively by src/integrations/supabase/client.ts
(globalThis as any).localStorage = {
  getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null, length: 0,
};
(globalThis as any).import = { meta: { env: {} } };

const { getHardcodedScenarios } = await import("../src/data/scenarios");

const root = resolve(__dirname, "..");

// Feats: copy JSON verbatim
mkdirSync(resolve(root, "supabase/functions/public-feats"), { recursive: true });
copyFileSync(
  resolve(root, "src/data/feats-data.json"),
  resolve(root, "supabase/functions/public-feats/feats-data.json"),
);
console.log("✓ Synced feats-data.json");

// Scenarios: serialize TS module to JSON
mkdirSync(resolve(root, "supabase/functions/public-scenarios"), { recursive: true });
const scenarios = getHardcodedScenarios();
writeFileSync(
  resolve(root, "supabase/functions/public-scenarios/scenarios-data.json"),
  JSON.stringify({ scenarios }, null, 2),
);
console.log(`✓ Synced ${scenarios.length} scenarios`);
