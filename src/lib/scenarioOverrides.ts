import { supabase } from "@/integrations/supabase/client";
import type { Scenario } from "@/data/scenarios";
import { normalizeScenarioId } from "@/lib/scenarioIds";

/** field name → JSONB value */
export type ScenarioOverrideMap = Map<string, Map<string, any>>;

let _overrides: ScenarioOverrideMap | null = null;
let _loading: Promise<ScenarioOverrideMap> | null = null;
let _generation = 0;

async function fetchScenarioOverrides(): Promise<ScenarioOverrideMap> {
  const map: ScenarioOverrideMap = new Map();
  const { data, error } = await supabase
    .from("scenario_overrides" as any)
    .select("scenario_id, field, value");
  if (error) throw error;
  if (data) {
    const setOverride = (scenarioId: string, field: string, value: any) => {
      const existing = map.get(scenarioId);
      if (existing) { existing.set(field, value); return; }
      map.set(scenarioId, new Map([[field, value]]));
    };
    for (const row of data as any[]) {
      const scenarioId = row.scenario_id as string;
      setOverride(scenarioId, row.field, row.value);
      const normalizedScenarioId = normalizeScenarioId(scenarioId);
      if (normalizedScenarioId && normalizedScenarioId !== scenarioId) {
        setOverride(normalizedScenarioId, row.field, row.value);
      }
    }
  }
  return map;
}

/**
 * SYNC-15: propagate load errors (never cache a failed load) and notify
 * subscribers when overrides refresh.
 */
export async function loadScenarioOverrides(): Promise<ScenarioOverrideMap> {
  if (_overrides) return _overrides;
  if (_loading) return _loading;
  const gen = ++_generation;
  _loading = (async () => {
    try {
      const map = await fetchScenarioOverrides();
      if (gen === _generation) {
        _overrides = map;
        try { window.dispatchEvent(new CustomEvent("overrides-change")); } catch {}
      }
      return map;
    } finally {
      _loading = null;
    }
  })();
  return _loading;
}

/**
 * B-05: non-destructive refresh — swap `_overrides` only on success, keeping
 * the old cache alive during the fetch so consumers don't downgrade to
 * bundled content.
 */
export async function refreshScenarioOverrides(): Promise<ScenarioOverrideMap> {
  const gen = ++_generation;
  const map = await fetchScenarioOverrides();
  if (gen === _generation) {
    _overrides = map;
    try { window.dispatchEvent(new CustomEvent("overrides-change")); } catch {}
  }
  return map;
}

export function getCachedScenarioOverrides(): ScenarioOverrideMap | null {
  return _overrides;
}

export function invalidateScenarioOverrides() {
  _overrides = null;
  _loading = null;
  _generation++;
}

/** Apply DB overrides to a single scenario. */
export function applyScenarioOverrides(scenario: Scenario, overrides: ScenarioOverrideMap): Scenario {
  const normalizedScenarioId = normalizeScenarioId(scenario.id);
  const fields = overrides.get(scenario.id) ?? (normalizedScenarioId ? overrides.get(normalizedScenarioId) : undefined);
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

export function hasScenarioOverrides(scenarioId: string, overrides: ScenarioOverrideMap): boolean {
  const fields = overrides.get(scenarioId);
  return !!fields && fields.size > 0;
}
