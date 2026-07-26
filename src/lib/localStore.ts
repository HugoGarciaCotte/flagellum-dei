/**
 * Local-first data store backed by localStorage.
 * All reads are synchronous from an in-memory cache.
 * Writes update both memory and localStorage, then emit change events.
 *
 * SYNC-01: dirty-row set is persisted so unpushed edits survive reload.
 * SYNC-02: dirty rows always win over server snapshots.
 * SYNC-07: `mergeCleanRow` writes server responses without marking dirty.
 * SYNC-14: cross-tab `storage` listener merges other tabs' writes.
 * §5.1: outbox metadata (attempts, backoff, timestamps).
 * §5.2: quarantine store for entries the server will never accept.
 * §6.1: structured sync journal ring buffer.
 * AUTH-01: `reassignLocalUser` re-homes local-guest rows to a real uid.
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

// Initialize from localStorage. Corrupt blobs are preserved under ls_corrupt_*
// so the user's only copy of unsynced edits isn't destroyed by a JSON error.
for (const table of TABLES) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + table);
    cache.set(table, raw ? JSON.parse(raw) : []);
  } catch {
    try {
      const raw = localStorage.getItem(LS_PREFIX + table);
      if (raw) localStorage.setItem(`ls_corrupt_${table}_${Date.now()}`, raw);
    } catch {}
    cache.set(table, []);
  }
}

function emitSyncError(table: string, message: string, ids: string[] = []) {
  try {
    window.dispatchEvent(new CustomEvent("sync-error", { detail: { table, ids, message } }));
  } catch {}
}

/** Strip oversized base64 data: URIs from the serialized snapshot so they don't blow the ~5MB quota. */
function sanitizeForPersist(table: TableName, rows: Row[]): Row[] {
  if (table !== "characters") return rows;
  let stripped = 0;
  const out = rows.map((r: any) => {
    const url = r?.portrait_url;
    if (typeof url === "string" && url.startsWith("data:") && url.length > 100_000) {
      stripped++;
      return { ...r, portrait_url: null };
    }
    return r;
  });
  if (stripped > 0) {
    emitSyncError(
      "characters",
      `${stripped} portrait(s) too large for local storage — they will re-sync from the cloud`,
    );
  }
  return out;
}

let _persistFailures = 0;
export function getPersistFailures() { return _persistFailures; }

function persist(table: TableName) {
  const rows = cache.get(table) ?? [];
  try {
    localStorage.setItem(LS_PREFIX + table, JSON.stringify(sanitizeForPersist(table, rows)));
  } catch (e: any) {
    _persistFailures++;
    console.warn("localStorage persist failed:", e);
    const isQuota = e?.name === "QuotaExceededError" || /quota/i.test(e?.message ?? "");
    if (isQuota && table === "characters") {
      try {
        const slim = rows.map((r: any) => ({ ...r, portrait_url: null }));
        localStorage.setItem(LS_PREFIX + table, JSON.stringify(slim));
        emitSyncError("characters", "Local storage full — portraits dropped from cache (will reload from cloud)");
      } catch {
        emitSyncError(table, "Local storage full — clear cache or sign out unused devices");
      }
    } else {
      emitSyncError(table, isQuota ? "Local storage full — clear cache or sign out unused devices" : (e?.message ?? "persist failed"));
    }
  }
  window.dispatchEvent(new CustomEvent("localstore-change", { detail: { table } }));
}

// --- Dirty-row tracking (SYNC-01: persisted) ---

const DIRTY_KEY = "ls_dirty_rows";

function loadDirtySet(): Set<string> {
  try {
    const raw = localStorage.getItem(DIRTY_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

const _dirtyRows = loadDirtySet();

function persistDirtySet() {
  try {
    localStorage.setItem(DIRTY_KEY, JSON.stringify([..._dirtyRows]));
  } catch {}
}

function markDirty(table: TableName, id: string) {
  const k = `${table}:${id}`;
  _dirtyRows.add(k);
  persistDirtySet();
  noteEnqueued(table, id);
}

export function getDirtyRows(): { table: TableName; id: string }[] {
  return [..._dirtyRows].map((key) => {
    const [table, id] = key.split(":", 2);
    return { table: table as TableName, id };
  });
}

export function clearDirty() {
  _dirtyRows.clear();
  persistDirtySet();
  _outboxMeta.clear();
  persistOutboxMeta();
}

/** Clear dirty markers for a specific set of (table,id) rows (successful push). */
export function clearDirtyFor(rows: { table: TableName; id: string }[]) {
  const keys: string[] = [];
  for (const { table, id } of rows) {
    const k = `${table}:${id}`;
    _dirtyRows.delete(k);
    _outboxMeta.delete(k);
    keys.push(k);
  }
  persistDirtySet();
  persistOutboxMeta();
  // B-04: broadcast clears cross-tab so other tabs drop their now-stale
  // dirty markers instead of re-pushing an outdated row.
  writeDirtyTombstone(keys);
}

const DIRTY_TOMBSTONE_KEY = "ls_dirty_cleared";
function writeDirtyTombstone(keys: string[]) {
  if (keys.length === 0) return;
  try {
    localStorage.setItem(DIRTY_TOMBSTONE_KEY, JSON.stringify({ keys, at: Date.now() }));
  } catch {}
}

// --- Outbox metadata (§5.1) ---

export type OutboxMeta = {
  at: string;
  attempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: number;
  lastError?: { code?: string; message: string; at: string };
};

const OUTBOX_META_KEY = "ls_outbox_meta";

function loadOutboxMeta(): Map<string, OutboxMeta> {
  try {
    const raw = localStorage.getItem(OUTBOX_META_KEY);
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [string, OutboxMeta][]);
  } catch { return new Map(); }
}

const _outboxMeta = loadOutboxMeta();

function persistOutboxMeta() {
  try {
    localStorage.setItem(OUTBOX_META_KEY, JSON.stringify([..._outboxMeta.entries()]));
  } catch {}
}

export function noteEnqueued(table: TableName, id: string) {
  const k = `${table}:${id}`;
  const existing = _outboxMeta.get(k);
  if (!existing) {
    _outboxMeta.set(k, { at: new Date().toISOString(), attempts: 0 });
  } else {
    // Fresh content deserves a prompt retry.
    delete existing.nextAttemptAt;
  }
  persistOutboxMeta();
}

export function noteAttempt(table: TableName, id: string, nextAttemptAt: number | undefined, error?: { code?: string; message: string }) {
  const k = `${table}:${id}`;
  const meta = _outboxMeta.get(k) ?? { at: new Date().toISOString(), attempts: 0 };
  meta.attempts++;
  meta.lastAttemptAt = new Date().toISOString();
  if (nextAttemptAt !== undefined) meta.nextAttemptAt = nextAttemptAt;
  else delete meta.nextAttemptAt;
  if (error) meta.lastError = { ...error, at: new Date().toISOString() };
  _outboxMeta.set(k, meta);
  persistOutboxMeta();
}

/**
 * B-01: defer a retry WITHOUT incrementing attempts. Used for connectivity
 * failures so offline / lie-fi / captive-portal edits can't drift into the
 * quarantine cap and disappear from the UI.
 */
export function noteDeferred(table: TableName, id: string, nextAttemptAt: number, error?: { code?: string; message: string }) {
  const k = `${table}:${id}`;
  const meta = _outboxMeta.get(k) ?? { at: new Date().toISOString(), attempts: 0 };
  meta.lastAttemptAt = new Date().toISOString();
  meta.nextAttemptAt = nextAttemptAt;
  if (error) meta.lastError = { ...error, at: new Date().toISOString() };
  _outboxMeta.set(k, meta);
  persistOutboxMeta();
}

export function getOutboxMeta(table: TableName, id: string): OutboxMeta | undefined {
  return _outboxMeta.get(`${table}:${id}`);
}

export function getAllOutboxMeta(): { key: string; meta: OutboxMeta }[] {
  return [..._outboxMeta.entries()].map(([key, meta]) => ({ key, meta }));
}

// --- Quarantine store (§5.2) ---

export type QuarantineReason = "terminal-error" | "max-attempts" | "rls-rejected" | "foreign-owner" | "conflict" | "corrupt-source";

export type QuarantineEntry = {
  key: string;
  table: TableName;
  id: string;
  row: Row;
  reason: QuarantineReason;
  error?: { code?: string; message: string };
  firstFailedAt: string;
  quarantinedAt: string;
  attempts: number;
};

const QUARANTINE_KEY = "ls_quarantine";
const QUARANTINE_CAP = 100;

function loadQuarantine(): QuarantineEntry[] {
  try {
    const raw = localStorage.getItem(QUARANTINE_KEY);
    return raw ? (JSON.parse(raw) as QuarantineEntry[]) : [];
  } catch { return []; }
}

let _quarantine: QuarantineEntry[] = loadQuarantine();

function persistQuarantine() {
  try {
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(_quarantine));
  } catch {}
  window.dispatchEvent(new CustomEvent("sync-quarantine-change"));
}

export function getQuarantine(): QuarantineEntry[] { return [..._quarantine]; }

export function quarantineRow(table: TableName, id: string, reason: QuarantineReason, error?: { code?: string; message: string }): boolean {
  if (_quarantine.length >= QUARANTINE_CAP) {
    // Refuse to auto-quarantine more (invariant 1: never silently discard).
    appendSyncError({ table, ids: [id], message: `Quarantine full — keeping this change in the queue` });
    return false;
  }
  const row = (cache.get(table) ?? []).find((r: any) => r.id === id);
  const k = `${table}:${id}`;
  const meta = _outboxMeta.get(k);
  if (row) {
    _quarantine.push({
      key: k, table, id, row: structuredClone(row), reason, error,
      firstFailedAt: meta?.lastError?.at ?? new Date().toISOString(),
      quarantinedAt: new Date().toISOString(),
      attempts: meta?.attempts ?? 0,
    });
    persistQuarantine();
  }
  // Marker leaves the live queue; the row itself stays in the store (may still be visible).
  _dirtyRows.delete(k);
  _outboxMeta.delete(k);
  persistDirtySet();
  persistOutboxMeta();
  writeDirtyTombstone([k]); // B-04: mirror to other tabs.
  appendSyncError({ table, ids: [id], message: `Change parked: ${reason}${error?.message ? ` — ${error.message}` : ""}` });
  journal({ op: "quarantine", table, ids: [id], code: error?.code, msg: error?.message, ok: false });
  return true;
}

export function retryQuarantined(key: string) {
  const idx = _quarantine.findIndex((q) => q.key === key);
  if (idx < 0) return;
  const entry = _quarantine[idx];
  _quarantine.splice(idx, 1);
  persistQuarantine();
  // Re-inject with attempts reset.
  upsertRow(entry.table, entry.row);
  const k = `${entry.table}:${entry.id}`;
  const meta = _outboxMeta.get(k);
  if (meta) { meta.attempts = 0; delete meta.nextAttemptAt; delete meta.lastError; _outboxMeta.set(k, meta); persistOutboxMeta(); }
}

export function discardQuarantined(key: string) {
  const idx = _quarantine.findIndex((q) => q.key === key);
  if (idx < 0) return;
  _quarantine.splice(idx, 1);
  persistQuarantine();
}

// --- Structured journal (§6.1) ---

export type JournalEntry = {
  t: string;
  op: string;
  table?: string;
  ids?: string[];
  ok?: boolean;
  ms?: number;
  status?: number;
  code?: string;
  msg?: string;
  online?: boolean;
};

const JOURNAL_KEY = "ls_sync_journal";
const JOURNAL_MAX = 300;

export function journal(e: Omit<JournalEntry, "t" | "online"> & Partial<Pick<JournalEntry, "t" | "online">>) {
  try {
    const entry: JournalEntry = {
      t: e.t ?? new Date().toISOString(),
      online: e.online ?? (typeof navigator !== "undefined" ? navigator.onLine : true),
      ...e,
    };
    if (entry.msg && entry.msg.length > 200) entry.msg = entry.msg.slice(0, 200);
    const raw = localStorage.getItem(JOURNAL_KEY);
    const list: JournalEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    if (list.length > JOURNAL_MAX) list.length = JOURNAL_MAX;
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(list));
  } catch {}
}

export function getJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// --- Last-sync timestamp ---

const LAST_SYNC_KEY = "ls_last_sync";

export function getLastSync(): string | null {
  try { return localStorage.getItem(LAST_SYNC_KEY); } catch { return null; }
}

export function setLastSync(ts: string) {
  try { localStorage.setItem(LAST_SYNC_KEY, ts); } catch {}
}

// --- Sync error log ---

const SYNC_ERRORS_KEY = "ls_sync_errors";
const MAX_SYNC_ERRORS = 20;

export type SyncError = {
  at: string;
  table: string;
  ids: string[];
  message: string;
};

export function getSyncErrors(): SyncError[] {
  try {
    const raw = localStorage.getItem(SYNC_ERRORS_KEY);
    return raw ? (JSON.parse(raw) as SyncError[]) : [];
  } catch { return []; }
}

export function appendSyncError(err: Omit<SyncError, "at"> & { at?: string }) {
  const entry: SyncError = { at: err.at ?? new Date().toISOString(), ...err };
  const existing = getSyncErrors();
  const next = [entry, ...existing].slice(0, MAX_SYNC_ERRORS);
  try { localStorage.setItem(SYNC_ERRORS_KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new CustomEvent("sync-errors-change"));
}

export function clearSyncErrors() {
  try { localStorage.removeItem(SYNC_ERRORS_KEY); } catch {}
  window.dispatchEvent(new CustomEvent("sync-errors-change"));
}

// --- Read (auto-filters soft-deleted rows) ---

export function getTable<T = Row>(table: TableName): T[] {
  return ((cache.get(table) ?? []) as T[]).filter((r: any) => !r.deleted_at);
}

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

/**
 * SYNC-02: dirty local row ALWAYS wins over incoming snapshot.
 */
export function setTableKeepDirty(table: TableName, rows: Row[]) {
  const existing = cache.get(table) ?? [];
  const incoming = new Map(rows.map((r) => [r.id, r]));
  for (const row of existing) {
    if (_dirtyRows.has(`${table}:${row.id}`)) {
      incoming.set(row.id, row); // local unpushed edit always wins
    }
  }
  cache.set(table, [...incoming.values()]);
  persist(table);
}

/** Merge incoming rows into existing cache by id (upsert, no replace) */
export function mergeTable(table: TableName, rows: Row[]) {
  const existing = cache.get(table) ?? [];
  const map = new Map(existing.map((r) => [r.id, r]));
  for (const row of rows) {
    if (_dirtyRows.has(`${table}:${row.id}`)) continue; // preserve local dirty
    map.set(row.id, row);
  }
  cache.set(table, [...map.values()]);
  persist(table);
}

/**
 * SYNC-02: dirty rows always win.
 */
export function replaceBy(table: TableName, filter: Record<string, any>, rows: Row[]) {
  const existing = cache.get(table) ?? [];
  const kept = existing.filter((row) => {
    // Keep rows that don't match the filter scope
    for (const [key, val] of Object.entries(filter)) {
      if (row[key] !== val) return true;
    }
    // In-scope: keep only if dirty (local unpushed edit)
    return _dirtyRows.has(`${table}:${row.id}`);
  });
  // Incoming rows first, then dirty kept rows overwrite (dirty wins).
  const map = new Map(rows.map((r) => [r.id, r]));
  for (const row of kept) map.set(row.id, row);
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

/**
 * SYNC-07: upsert a server-sourced row WITHOUT marking it dirty.
 * Use for RPC responses, echo pulls, and any server-authored data.
 */
export function mergeCleanRow(table: TableName, row: Row) {
  const rows = cache.get(table) ?? [];
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
  else rows.push(row);
  cache.set(table, rows);
  persist(table);
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

export function deleteRow(table: TableName, id: string) {
  const rows = cache.get(table) ?? [];
  cache.set(table, rows.filter((r) => r.id !== id));
  persist(table);
  // ST-08: drop any ghost dirty marker for a rowless entry.
  const k = `${table}:${id}`;
  if (_dirtyRows.has(k)) {
    _dirtyRows.delete(k);
    _outboxMeta.delete(k);
    persistDirtySet();
    persistOutboxMeta();
  }
}

export function deleteBy(table: TableName, filter: Record<string, any>) {
  const rows = cache.get(table) ?? [];
  const removed: string[] = [];
  const kept = rows.filter((row) => {
    for (const [key, val] of Object.entries(filter)) {
      if (row[key] !== val) return true;
    }
    if (typeof row.id === "string") removed.push(row.id);
    return false;
  });
  cache.set(table, kept);
  persist(table);
  // B-14: also drop the dirty marker + outbox meta for each removed row so
  // deletions don't leave phantom dirty ids in the queue.
  if (removed.length > 0) {
    clearDirtyFor(removed.map((id) => ({ table, id })));
  }
}

/**
 * Return true only when we're switching between two distinct non-null user ids.
 * A-01: prevents `clearAll()` on transient `SIGNED_OUT` events (token refresh, cross-tab sign-out).
 */
export function shouldClearOnUserChange(prev: string | undefined, next: string | undefined): boolean {
  return !!prev && !!next && prev !== next;
}

export function clearAll() {
  for (const table of TABLES) {
    cache.set(table, []);
    localStorage.removeItem(LS_PREFIX + table);
  }
  clearDirty();
  try { localStorage.removeItem(LAST_SYNC_KEY); } catch {}
  try { localStorage.removeItem(DIRTY_KEY); } catch {}
  try { localStorage.removeItem(OUTBOX_META_KEY); } catch {}
  // B-15: also drop errors and quarantine so a new user on the same device
  // doesn't inherit A's parked rows / error log.
  try { localStorage.removeItem(SYNC_ERRORS_KEY); } catch {}
  try { localStorage.removeItem(QUARANTINE_KEY); } catch {}
  _quarantine = [];
  window.dispatchEvent(new CustomEvent("sync-errors-change"));
  window.dispatchEvent(new CustomEvent("sync-quarantine-change"));
  window.dispatchEvent(new CustomEvent("localstore-change", { detail: { table: "*" } }));
}

/** Remove ended/deleted games older than 24h from local cache to reclaim space. */
export function evictStaleGames(hostUserId?: string) {
  const games = cache.get("games") ?? [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const staleIds = new Set<string>();

  const freshGames = games.filter((g) => {
    if (hostUserId && g.host_user_id === hostUserId) return true;
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

  const players = cache.get("game_players") ?? [];
  cache.set("game_players", players.filter((p) => !staleIds.has(p.game_id)));
  persist("game_players");

  // Clear dirty markers for evicted rows.
  for (const id of staleIds) {
    const k = `games:${id}`;
    if (_dirtyRows.has(k)) { _dirtyRows.delete(k); _outboxMeta.delete(k); }
  }
  persistDirtySet();
  persistOutboxMeta();
}

// --- AUTH-01: re-home local-guest rows to a real uid ---

export function reassignLocalUser(oldUserId: string, newUserId: string) {
  if (!oldUserId || !newUserId || oldUserId === newUserId) return;
  for (const table of TABLES) {
    const rows = cache.get(table) ?? [];
    let changed = false;
    for (const row of rows) {
      if (row.user_id === oldUserId) { row.user_id = newUserId; markDirty(table, row.id); changed = true; }
      if (row.host_user_id === oldUserId) { row.host_user_id = newUserId; markDirty(table, row.id); changed = true; }
    }
    if (changed) persist(table);
  }
}

// --- SYNC-14: cross-tab merging ---

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    if (e.key === DIRTY_KEY) {
      try {
        for (const k of JSON.parse(e.newValue ?? "[]") as string[]) _dirtyRows.add(k);
      } catch {}
      return;
    }
    if (e.key === OUTBOX_META_KEY) {
      try {
        for (const [k, v] of JSON.parse(e.newValue ?? "[]") as [string, OutboxMeta][]) {
          if (!_outboxMeta.has(k)) _outboxMeta.set(k, v);
        }
      } catch {}
      return;
    }
    if (e.key.startsWith(LS_PREFIX) && e.key !== LAST_SYNC_KEY && e.key !== SYNC_ERRORS_KEY && e.key !== QUARANTINE_KEY && e.key !== JOURNAL_KEY) {
      const table = e.key.slice(LS_PREFIX.length) as TableName;
      if (!(TABLES as readonly string[]).includes(table)) return;
      try {
        const incoming: Row[] = e.newValue ? JSON.parse(e.newValue) : [];
        const map = new Map(incoming.map((r) => [r.id, r]));
        for (const row of cache.get(table) ?? []) {
          if (_dirtyRows.has(`${table}:${row.id}`)) map.set(row.id, row);
        }
        cache.set(table, [...map.values()]);
        window.dispatchEvent(new CustomEvent("localstore-change", { detail: { table } }));
      } catch {}
    }
  });
}
