const SCENARIOS_KEY = "qs_offline_scenarios";
const SECTIONS_KEY = "qs_offline_sections";

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

export function cacheSections(sections: any[]) {
  try {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
  } catch (e) {
    console.warn("Failed to cache sections:", e);
  }
}

export function getCachedSections(scenarioId?: string): any[] | null {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as any[];
    if (scenarioId) return all.filter((s) => s.scenario_id === scenarioId);
    return all;
  } catch {
    return null;
  }
}

export function getCachedSectionById(sectionId: string): any | null {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as any[];
    return all.find((s) => s.id === sectionId) ?? null;
  } catch {
    return null;
  }
}
