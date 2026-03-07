const SCENARIOS_KEY = "qs_offline_scenarios";

export function isOffline(): boolean {
  return !navigator.onLine;
}

export function cacheScenarios(scenarios: any[]) {
  try {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
  } catch (e) {
    console.warn("Failed to cache scenarios:", e);
  }
}

export function getCachedScenarios(): any[] | null {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCachedScenarioById(scenarioId: string): any | null {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as any[];
    return all.find((s) => s.id === scenarioId) ?? null;
  } catch {
    return null;
  }
}
