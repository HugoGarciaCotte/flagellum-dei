import type { ExhaustionType } from "@/data/feats";

/** Per-character feat exhaustion state, persisted on character.feats[i]. */
export interface FeatExhaustionState {
  exhausted_at?: string | null;
  exhausted_scenario_id?: string | null;
  used_forever?: boolean;
}

/** Map exhaustion type → number of scenarios it covers (use scenario counts as #1). */
export function exhaustionScenarioSpan(t: ExhaustionType): number {
  switch (t) {
    case "once_per_scenario": return 1;
    case "once_per_2_scenarios": return 2;
    case "once_per_3_scenarios": return 3;
    default: return 0;
  }
}

/**
 * scenarioHistory: ordered list of distinct scenario_ids the player has joined
 * (earliest first, deduped). Required to compute auto-recharge.
 */
export function isFeatExhausted(
  state: FeatExhaustionState | undefined | null,
  type: ExhaustionType,
  scenarioHistory: string[],
): boolean {
  if (!state) return false;
  if (type === "infinite") return false;
  if (type === "once_forever") return !!state.used_forever;
  if (!state.exhausted_at) return false;
  const span = exhaustionScenarioSpan(type);
  if (span <= 0) return false;
  const scenarioId = state.exhausted_scenario_id;
  if (!scenarioId) {
    // Used outside of any scenario — count subsequent joins from the time of use.
    // Without a scenario anchor, fall back to "until at least `span` scenarios joined since".
    // Conservative: treat as exhausted until span scenarios have been joined after the use timestamp.
    // We don't have join timestamps here, so we keep it exhausted until manually recharged.
    return true;
  }
  const idx = scenarioHistory.indexOf(scenarioId);
  if (idx < 0) {
    // Scenario not in history (maybe the player left): keep exhausted, force manual recharge.
    return true;
  }
  // scenarios covered: the exhausting scenario + (span - 1) subsequent ones.
  // Recharged once the player has joined `span` distinct scenarios *including* the one used in.
  const scenariosSinceUse = scenarioHistory.length - idx; // includes the used one
  return scenariosSinceUse < span;
}

export function exhaustionLabelKind(
  state: FeatExhaustionState | undefined | null,
  type: ExhaustionType,
  isExhausted: boolean,
): "used" | "exhausted" | null {
  if (type === "once_forever") return state?.used_forever ? "used" : null;
  return isExhausted ? "exhausted" : null;
}
