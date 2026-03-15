import { supabase } from "@/integrations/supabase/client";
import type { Scenario } from "@/data/scenarios";

/** field name → JSONB value */
export type ScenarioOverrideMap = Map<string, Map<string, any>>;

let _overrides: ScenarioOverrideMap | null = null;
let _loading: Promise<ScenarioOverrideMap> | null = null;

/** Fetch all scenario_overrides from DB. Caches in memory. */
export async function loadScenarioOverrides(): Promise<ScenarioOverrideMap> {
  if (_overrides) return _overrides;
  if (_loading) return _loading;
  _loading = (async () => {
    const map: ScenarioOverrideMap = new Map();
    const { data } = await supabase
      .from("scenario_overrides" as any)
      .select("scenario_id, field, value");
    if (data) {
      for (const row of data as any[]) {
        if (!map.has(row.scenario_id)) map.set(row.scenario_id, new Map());
        map.get(row.scenario_id)!.set(row.field, row.value);
      }
    }
    _overrides = map;
    _loading = null;
    return map;
  })();
  return _loading;
}

/** Get cached overrides (returns null if not yet loaded). */
export function getCachedScenarioOverrides(): ScenarioOverrideMap | null {
  return _overrides;
}

/** Invalidate cache so next load re-fetches. */
export function invalidateScenarioOverrides() {
  _overrides = null;
  _loading = null;
}

/** Apply DB overrides to a single scenario. */
export function applyScenarioOverrides(scenario: Scenario, overrides: ScenarioOverrideMap): Scenario {
  const fields = overrides.get(scenario.id);
  if (!fields || fields.size === 0) return scenario;

  const result = { ...scenario };
  const fr: Record<string, string> = { ...(scenario.fr || {}) } as any;
  let hasFr = !!scenario.fr;

  for (const [field, value] of fields) {
    if (field.startsWith("fr:")) {
      const realField = field.slice(3);
      (fr as any)[realField] = value;
      hasFr = true;
    } else if (field === "title") result.title = value;
    else if (field === "teaser") result.teaser = value;
    else if (field === "level") result.level = value;
    else if (field === "content") result.content = value;
  }

  if (hasFr) result.fr = fr as any;
  return result;
}

/** Check if a scenario has any DB overrides. */
export function hasScenarioOverrides(scenarioId: string, overrides: ScenarioOverrideMap): boolean {
  const fields = overrides.get(scenarioId);
  return !!fields && fields.size > 0;
}
