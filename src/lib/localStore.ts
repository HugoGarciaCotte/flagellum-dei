/**
 * Local-first data store backed by localStorage.
 * All reads are synchronous from an in-memory cache.
 * Writes update both memory and localStorage, then emit change events.
 */

const LS_PREFIX = "ls_";

export const TABLES = [
  "characters",
  "character_feats",
  "character_feat_subfeats",
  "games",
  "game_players",
  "profiles",
  "user_roles",
] as const;

export type TableName = (typeof TABLES)[number];
type Row = Record<string, any> & { id: string };

const cache = new Map<TableName, Row[]>();

// Initialize from localStorage
for (const table of TABLES) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + table);
    cache.set(table, raw ? JSON.parse(raw) : []);
  } catch {
    cache.set(table, []);
  }
}

function persist(table: TableName) {
  try {
    localStorage.setItem(LS_PREFIX + table, JSON.stringify(cache.get(table) ?? []));
  } catch (e) {
    console.warn("localStorage persist failed:", e);
  }
  window.dispatchEvent(new CustomEvent("localstore-change", { detail: { table } }));
}

// --- Dirty-row tracking ---

const _dirtyRows = new Set<string>();

function markDirty(table: TableName, id: string) {
  _dirtyRows.add(`${table}:${id}`);
}

export function getDirtyRows(): { table: TableName; id: string }[] {
  return [..._dirtyRows].map((key) => {
    const [table, id] = key.split(":", 2);
    return { table: table as TableName, id };
  });
}

export function clearDirty() {
  _dirtyRows.clear();
}

// --- Last-sync timestamp ---

const LAST_SYNC_KEY = "ls_last_sync";

export function getLastSync(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export function setLastSync(ts: string) {
  try {
    localStorage.setItem(LAST_SYNC_KEY, ts);
  } catch {}
}

// --- Read (auto-filters soft-deleted rows) ---

export function getTable<T = Row>(table: TableName): T[] {
  return ((cache.get(table) ?? []) as T[]).filter((r: any) => !r.deleted_at);
}

/** Get ALL rows including soft-deleted (for sync push) */
export function getTableRaw<T = Row>(table: TableName): T[] {
  return (cache.get(table) ?? []) as T[];
}

export function getRow<T = Row>(table: TableName, id: string): T | undefined {
  const row = (cache.get(table) ?? []).find((r) => r.id === id) as T | undefined;
  if (row && (row as any).deleted_at) return undefined;
  return row;
}

export function getBy<T = Row>(table: TableName, filter: Record<string, any>): T[] {
  return ((cache.get(table) ?? []) as T[]).filter((row: any) => {
    if (row.deleted_at) return false;
    for (const [key, val] of Object.entries(filter)) {
      if (row[key] !== val) return false;
    }
    return true;
  });
}

// --- Write ---

export function setTable(table: TableName, rows: Row[]) {
  cache.set(table, rows);
  persist(table);
}

/** Merge incoming rows into existing cache by id (upsert, no replace) */
export function mergeTable(table: TableName, rows: Row[]) {
  const existing = cache.get(table) ?? [];
  const map = new Map(existing.map((r) => [r.id, r]));
  for (const row of rows) {
    map.set(row.id, row);
  }
  cache.set(table, [...map.values()]);
  persist(table);
}

export function upsertRow(table: TableName, row: Row) {
  const rows = cache.get(table) ?? [];
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...row };
  } else {
    rows.push(row);
  }
  cache.set(table, rows);
  persist(table);
  markDirty(table, row.id);
}

/** Soft-delete a row by setting deleted_at */
export function softDeleteRow(table: TableName, id: string) {
  const rows = cache.get(table) ?? [];
  const idx = rows.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    cache.set(table, rows);
    persist(table);
    markDirty(table, id);
  }
}

/** Soft-delete rows matching a filter */
export function softDeleteBy(table: TableName, filter: Record<string, any>) {
  const rows = cache.get(table) ?? [];
  const now = new Date().toISOString();
  for (const row of rows) {
    if (row.deleted_at) continue;
    let match = true;
    for (const [key, val] of Object.entries(filter)) {
      if (row[key] !== val) { match = false; break; }
    }
    if (match) {
      row.deleted_at = now;
      row.updated_at = now;
      markDirty(table, row.id);
    }
  }
  cache.set(table, rows);
  persist(table);
}

// Keep hard-delete for local cache eviction only (not synced)
export function deleteRow(table: TableName, id: string) {
  const rows = cache.get(table) ?? [];
  cache.set(table, rows.filter((r) => r.id !== id));
  persist(table);
}

export function deleteBy(table: TableName, filter: Record<string, any>) {
  const rows = cache.get(table) ?? [];
  cache.set(table, rows.filter((row) => {
    for (const [key, val] of Object.entries(filter)) {
      if (row[key] !== val) return true;
    }
    return false;
  }));
  persist(table);
}

export function clearAll() {
  for (const table of TABLES) {
    cache.set(table, []);
    localStorage.removeItem(LS_PREFIX + table);
  }
  clearDirty();
  try { localStorage.removeItem(LAST_SYNC_KEY); } catch {}
  window.dispatchEvent(new CustomEvent("localstore-change", { detail: { table: "*" } }));
}

/** Remove ended/deleted games older than 24h from local cache to reclaim space */
export function evictStaleGames() {
  const games = cache.get("games") ?? [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const staleIds = new Set<string>();

  const freshGames = games.filter((g) => {
    if (g.status === "ended" || g.deleted_at) {
      const updatedAt = new Date(g.updated_at).getTime();
      if (updatedAt < cutoff) {
        staleIds.add(g.id);
        return false;
      }
    }
    return true;
  });

  if (staleIds.size === 0) return;

  cache.set("games", freshGames);
  persist("games");

  // Also remove associated game_players
  const players = cache.get("game_players") ?? [];
  cache.set("game_players", players.filter((p) => !staleIds.has(p.game_id)));
  persist("game_players");
}
