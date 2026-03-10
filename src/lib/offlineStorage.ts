const GAME_SESSION_PREFIX = "qs_game_";
const GAME_SESSION_PREFIX = "qs_game_";
const FEATS_KEY = "qs_offline_feats";
const CHAR_FEATS_PREFIX = "qs_charfeats_";

export interface CachedGameSession {
  game: {
    id: string;
    status: string;
    join_code: string;
    current_section: string | null;
    host_user_id: string;
    scenario_id: string;
  };
  scenario: {
    title: string;
    description: string | null;
    content: string | null;
  };
  players: Array<{
    id: string;
    user_id: string;
    character_id: string | null;
    joined_at: string;
    profiles?: { display_name: string | null };
  }>;
  characters: Array<{
    id: string;
    name: string;
    description: string | null;
    user_id: string;
  }>;
  cachedAt: number;
}

export function isOffline(): boolean {
  return !navigator.onLine;
}

// --- Scenario caching ---

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

// --- Feats caching ---

export function cacheFeats(feats: any[]) {
  try {
    localStorage.setItem(FEATS_KEY, JSON.stringify(feats));
  } catch (e) {
    console.warn("Failed to cache feats:", e);
  }
}

export function getCachedFeats(): any[] | null {
  try {
    const raw = localStorage.getItem(FEATS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// --- Character feats caching ---

export function cacheCharacterFeats(characterId: string, feats: any[]) {
  try {
    localStorage.setItem(CHAR_FEATS_PREFIX + characterId, JSON.stringify(feats));
  } catch (e) {
    console.warn("Failed to cache character feats:", e);
  }
}

export function getCachedCharacterFeats(characterId: string): any[] | null {
  try {
    const raw = localStorage.getItem(CHAR_FEATS_PREFIX + characterId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// --- Game session caching ---

export function cacheGameSession(gameId: string, session: CachedGameSession) {
  try {
    localStorage.setItem(GAME_SESSION_PREFIX + gameId, JSON.stringify(session));
  } catch (e) {
    console.warn("Failed to cache game session:", e);
  }
}

export function getCachedGameSession(gameId: string): CachedGameSession | null {
  try {
    const raw = localStorage.getItem(GAME_SESSION_PREFIX + gameId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function updateCachedSection(gameId: string, sectionId: string | null) {
  try {
    const session = getCachedGameSession(gameId);
    if (session) {
      session.game.current_section = sectionId;
      session.cachedAt = Date.now();
      cacheGameSession(gameId, session);
    }
  } catch (e) {
    console.warn("Failed to update cached section:", e);
  }
}

// --- Image prefetching ---

export function prefetchImages(urls: string[]) {
  for (const url of urls) {
    const img = new Image();
    img.src = url;
  }
}
