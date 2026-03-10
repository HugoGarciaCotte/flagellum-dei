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

// --- Read ---

export function getTable<T = Row>(table: TableName): T[] {
  return (cache.get(table) ?? []) as T[];
}

export function getRow<T = Row>(table: TableName, id: string): T | undefined {
  return (cache.get(table) ?? []).find((r) => r.id === id) as T | undefined;
}

export function getBy<T = Row>(table: TableName, filter: Record<string, any>): T[] {
  return ((cache.get(table) ?? []) as T[]).filter((row: any) => {
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
  removeDeletion(table, row.id);
}

export function deleteRow(table: TableName, id: string) {
  const rows = cache.get(table) ?? [];
  cache.set(table, rows.filter((r) => r.id !== id));
  persist(table);
  trackDeletion(table, id);
}

export function deleteBy(table: TableName, filter: Record<string, any>) {
  const rows = cache.get(table) ?? [];
  const toKeep: Row[] = [];
  for (const row of rows) {
    let match = true;
    for (const [key, val] of Object.entries(filter)) {
      if (row[key] !== val) { match = false; break; }
    }
    if (match) trackDeletion(table, row.id);
    else toKeep.push(row);
  }
  cache.set(table, toKeep);
  persist(table);
}

// --- Deletion tracking ---

const DELETIONS_KEY = "ls_deletions";
type Deletion = { table: string; id: string };

export function getDeletions(): Deletion[] {
  try {
    const raw = localStorage.getItem(DELETIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function trackDeletion(table: TableName, id: string) {
  const dels = getDeletions();
  if (!dels.some((d) => d.table === table && d.id === id)) {
    dels.push({ table, id });
    localStorage.setItem(DELETIONS_KEY, JSON.stringify(dels));
  }
}

function removeDeletion(table: TableName, id: string) {
  localStorage.setItem(
    DELETIONS_KEY,
    JSON.stringify(getDeletions().filter((d) => !(d.table === table && d.id === id))),
  );
}

export function clearDeletions() {
  localStorage.removeItem(DELETIONS_KEY);
}

export function clearAll() {
  for (const table of TABLES) {
    cache.set(table, []);
    localStorage.removeItem(LS_PREFIX + table);
  }
  clearDeletions();
  window.dispatchEvent(new CustomEvent("localstore-change", { detail: { table: "*" } }));
}
