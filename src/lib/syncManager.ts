import { supabase } from "@/integrations/supabase/client";
import * as store from "./localStore";
import type { TableName } from "./localStore";
import { normalizeScenarioId } from "./scenarioIds";
import { purgeSwRestCaches } from "./swCachePurge";
import { invalidateScenarioOverrides, loadScenarioOverrides, refreshScenarioOverrides } from "./scenarioOverrides";
import { invalidateOverrides as invalidateFeatOverrides, loadFeatOverrides, refreshFeatOverrides } from "./featOverrides";
import { isReachable, lastReachable } from "./reachability";

const LOCAL_GUEST_KEY = "local-guest-user";

// §5.3 Error classification & backoff
const TERMINAL_CODES = new Set(["42501", "23505", "23503", "23502", "22P02", "22001", "PGRST204", "PGRST100", "413"]);
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 30 * 60_000;
const ATTEMPT_CAP = 8;

function classify(error: { code?: string; message?: string; status?: number }): "terminal" | "transient" {
  if (error.code && TERMINAL_CODES.has(error.code)) return "terminal";
  if (error.status && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 408 && error.status !== 429) return "terminal";
  return "transient";
}

function nextBackoff(attempts: number): number {
  const raw = Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1), BACKOFF_MAX_MS);
  return Date.now() + raw * (0.8 + Math.random() * 0.4);
}

function emitSyncError(table: string, message: string, ids: string[] = []) {
  try {
    window.dispatchEvent(new CustomEvent("sync-error", { detail: { table, ids, message } }));
  } catch {}
}

/**
 * SYNC-13: never auto-mint an anonymous identity from the sync engine.
 * Session creation is exclusively AuthContext.enterGuestMode's job.
 */
async function ensureSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return true;
  if (store.getDirtyRows().length > 0) {
    emitSyncError("session", "Not signed in — local changes will sync after you sign in");
  }
  return false;
}

// SYNC-03: serialized promise chain instead of a boolean guard.
let _chain: Promise<void> = Promise.resolve();
let _syncDepth = 0;
let _opStartedAt: number | null = null;
// B-03: generation-based watchdog reset so orphaned ops can't corrupt _syncDepth.
let _generation = 0;

// §2.1.4 wedge watchdog — kick every 30s to abort ops in flight > 90s.
if (typeof window !== "undefined") {
  setInterval(() => {
    if (_opStartedAt && Date.now() - _opStartedAt > 90_000) {
      store.journal({ op: "watchdog-reset", msg: `sync op exceeded 90s`, ok: false });
      _generation++; // orphan the stuck chain
      _chain = Promise.resolve();
      _syncDepth = 0;
      _opStartedAt = null;
      notify("synced");
    }
  }, 30_000);
}

function enqueueSync<T = void>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const myGen = _generation;
    _syncDepth++;
    _opStartedAt = Date.now();
    if (_syncDepth === 1) notify("syncing");
    try {
      return await fn();
    } finally {
      // B-03: ignore ops orphaned by a watchdog reset so bookkeeping stays sane.
      if (myGen === _generation) {
        _syncDepth--;
        if (_syncDepth === 0) {
          notify("synced");
          _opStartedAt = null;
        }
      }
    }
  };
  const next: Promise<T> = _chain.then(run, run);
  _chain = next.then(() => {}, () => {});
  return next;
}

export function isSyncing() { return _syncDepth > 0; }

function notify(type: "syncing" | "synced") {
  try { window.dispatchEvent(new CustomEvent(`sync-${type}`)); } catch {}
}

// --- Pull ---
//
// SYNC-09: never write snapshots derived from an errored response.

async function doPull(userId?: string) {
  const now = new Date().toISOString();
  const started = Date.now();

  // Give the SW cache purge a chance to finish; capped at 2s so a broken
  // Cache API can never block sync.
  await Promise.race([purgeSwRestCaches(), new Promise<void>((r) => setTimeout(r, 2000))]);

  if (!userId) {
    // SYNC-09: no-user branch must not overwrite the cache with an empty snapshot.
    store.setLastSync(now);
    return;
  }

  const [rolesRes, playerRefsRes, hostedRes, profileRes] = await Promise.all([
    supabase.from("user_roles").select("*").eq("user_id", userId),
    supabase.from("game_players").select("game_id").eq("user_id", userId),
    supabase.from("games").select("*").eq("host_user_id", userId),
    supabase.from("profiles").select("*").eq("user_id", userId),
  ]);

  if (rolesRes.error || playerRefsRes.error || hostedRes.error || profileRes.error) {
    const msg = rolesRes.error?.message ?? playerRefsRes.error?.message ?? hostedRes.error?.message ?? profileRes.error?.message ?? "pull failed";
    store.appendSyncError({ table: "pull", ids: [], message: msg });
    store.journal({ op: "pull", ok: false, msg, ms: Date.now() - started });
    throw new Error(msg);
  }

  store.setTableKeepDirty("user_roles", rolesRes.data ?? []);

  const playedGameIds = (playerRefsRes.data ?? []).map((r: any) => r.game_id);
  const hostedGames = hostedRes.data ?? [];

  // B-19: keep ended played games in the pull so players on /game/:id/play
  // still see the "quest ended" screen. `evictStaleGames` handles cleanup.
  const playedGamesRes = playedGameIds.length > 0
    ? await supabase.from("games").select("*").in("id", playedGameIds)
    : { data: [] as any[], error: null };
  if ((playedGamesRes as any).error) {
    const msg = (playedGamesRes as any).error.message;
    store.journal({ op: "pull", table: "games", ok: false, msg });
    throw new Error(msg);
  }

  const gamesById = new Map<string, any>();
  for (const g of hostedGames) gamesById.set(g.id, g);
  for (const g of playedGamesRes.data ?? []) gamesById.set(g.id, g);
  store.setTableKeepDirty("games", [...gamesById.values()]);

  const allGameIds = [...gamesById.keys()];

  const gpRes = allGameIds.length > 0
    ? await supabase.from("game_players").select("*").in("game_id", allGameIds)
    : { data: [] as any[], error: null };
  if ((gpRes as any).error) {
    const msg = (gpRes as any).error.message;
    store.journal({ op: "pull", table: "game_players", ok: false, msg });
    throw new Error(msg);
  }
  store.setTableKeepDirty("game_players", gpRes.data ?? []);

  const memberUserIds = new Set<string>([userId]);
  for (const p of gpRes.data ?? []) memberUserIds.add(p.user_id);
  const memberIdArr = [...memberUserIds];

  const [charsRes, profilesRes] = await Promise.all([
    supabase.from("characters").select("*").in("user_id", memberIdArr),
    supabase.from("profiles").select("*").in("user_id", memberIdArr),
  ]);

  if (charsRes.error) {
    store.journal({ op: "pull", table: "characters", ok: false, msg: charsRes.error.message });
    throw new Error(charsRes.error.message);
  }
  if (profilesRes.error) {
    store.journal({ op: "pull", table: "profiles", ok: false, msg: profilesRes.error.message });
    throw new Error(profilesRes.error.message);
  }

  store.setTableKeepDirty("characters", charsRes.data ?? []);

  const profilesById = new Map<string, any>();
  if (profileRes.data) for (const p of profileRes.data) profilesById.set(p.user_id, p);
  for (const p of profilesRes.data ?? []) profilesById.set(p.user_id, p);
  store.setTableKeepDirty("profiles", [...profilesById.values()]);

  store.setLastSync(now);
  store.journal({ op: "pull", ok: true, ms: Date.now() - started });

  // A-17: evict ended/deleted games older than 24h so the local cache doesn't
  // grow unbounded (host's own games are preserved).
  try { store.evictStaleGames(userId); } catch {}

  // SYNC-15 + B-05: refresh overrides non-destructively so consumers never
  // see the null-cache window that would downgrade content to bundled base.
  try {
    refreshScenarioOverrides().catch(() => {});
    refreshFeatOverrides().catch(() => {});
  } catch {}
}

// --- Push ---

function isEligible(table: TableName, id: string): boolean {
  const meta = store.getOutboxMeta(table, id);
  if (!meta) return true;
  if (!meta.nextAttemptAt) return true;
  return Date.now() >= meta.nextAttemptAt;
}

function isConnectivityError(error: { code?: string; message?: string; status?: number }): boolean {
  if (!error) return false;
  if (error.code === "TypeError" || error.code === "TimeoutError" || error.code === "AbortError") return true;
  const msg = (error.message ?? "").toLowerCase();
  return /failed to fetch|load failed|network|timeout|sync-timeout|aborted/.test(msg);
}

function handleRowFailure(table: TableName, row: any, error: { code?: string; message: string; status?: number }) {
  // B-01: connectivity failures are NOT attempts. Defer without incrementing.
  if (isConnectivityError(error)) {
    // Only count against the cap when the server was actually reachable.
    if (lastReachable() !== true) {
      store.noteDeferred(table, row.id, Date.now() + 30_000, error);
      return;
    }
  }
  const kind = classify(error);
  if (kind === "terminal") {
    const parked = store.quarantineRow(table, row.id, "terminal-error", error);
    // B-13: quarantine full → back off instead of hot-looping.
    if (!parked) {
      const attempts = (store.getOutboxMeta(table, row.id)?.attempts ?? 0) + 1;
      store.noteAttempt(table, row.id, nextBackoff(attempts), error);
    }
    return;
  }
  // Transient: bump attempts, backoff. Cap → quarantine.
  const meta = store.getOutboxMeta(table, row.id);
  const attempts = (meta?.attempts ?? 0) + 1;
  if (attempts >= ATTEMPT_CAP) {
    const parked = store.quarantineRow(table, row.id, "max-attempts", error);
    if (!parked) store.noteAttempt(table, row.id, nextBackoff(attempts), error);
    return;
  }
  store.noteAttempt(table, row.id, nextBackoff(attempts), error);
  store.appendSyncError({ table, ids: [row.id], message: error.message });
  emitSyncError(table, error.message, [row.id]);
  store.journal({ op: "push", table, ids: [row.id], ok: false, code: error.code, msg: error.message });
}

async function pushRow(table: TableName, row: any): Promise<boolean> {
  try {
    if (table === "user_roles") {
      // SYNC-16 + B-22: keep conflict target, drop ignoreDuplicates so updates
      // (e.g. tombstones) can reach the server.
      const { error } = await (supabase.from(table as any).upsert(row, { onConflict: "user_id,role" }) as any);
      if (error) { handleRowFailure(table, row, error); return false; }
      return true;
    }
    const { error } = await (supabase.from(table as any).upsert(row, { onConflict: "id" }) as any);
    if (error) { handleRowFailure(table, row, error); return false; }
    return true;
  } catch (e: any) {
    handleRowFailure(table, row, { message: e?.message ?? String(e), code: e?.name });
    return false;
  }
}

async function pushChunk(table: TableName, chunk: any[], succeeded: { table: TableName; id: string }[]) {
  if (chunk.length === 0) return;
  try {
    const onConflict = table === "user_roles" ? "user_id,role" : "id";
    const q: any = supabase.from(table as any).upsert(chunk as any, { onConflict });
    const { error } = await q;
    if (!error) {
      for (const r of chunk) succeeded.push({ table, id: r.id });
      return;
    }
    if (chunk.length === 1) {
      handleRowFailure(table, chunk[0], error);
      return;
    }
    // §5.4 Chunk isolation: retry row-by-row so poison rows can't block the healthy majority.
    for (const row of chunk) {
      const ok = await pushRow(table, row);
      if (ok) succeeded.push({ table, id: row.id });
    }
  } catch (e: any) {
    // B-01: connectivity-level throws should not penalize any row — just re-arm.
    const err = { message: e?.message ?? String(e), code: e?.name };
    if (isConnectivityError(err)) {
      store.journal({ op: "push", table, ok: false, code: err.code, msg: err.message });
      scheduleRetry();
      return;
    }
    // For non-network throws, isolate row-by-row so healthy rows aren't punished.
    for (const row of chunk) {
      const ok = await pushRow(table, row);
      if (ok) succeeded.push({ table, id: row.id });
    }
  }
}



async function doPush() {
  const dirtyRows = store.getDirtyRows();
  if (dirtyRows.length === 0) return;

  const byTable = new Map<TableName, string[]>();
  for (const { table, id } of dirtyRows) {
    if (!isEligible(table, id)) continue;
    const ids = byTable.get(table) || [];
    ids.push(id);
    byTable.set(table, ids);
  }

  const pushOrder: TableName[] = ["profiles", "user_roles", "characters", "games", "game_players"];
  const succeeded: { table: TableName; id: string }[] = [];

  // SYNC-12: snapshot content at push time so mid-flight edits aren't wrongly cleared.
  const snapshot = new Map<string, string>();

  for (const table of pushOrder) {
    const ids = byTable.get(table);
    if (!ids || ids.length === 0) continue;

    const allRows = store.getTableRaw(table);
    const rows = allRows.filter((r: any) => ids.includes(r.id));
    if (rows.length === 0) continue;

    // SYNC-07: never push a foreign `games` row (only the host can).
    // Marks them synced (so they leave the queue) and logs once.
    const sanitized = rows
      .map((r: any) => {
        const { pending_sync, ...rest } = r;
        if (table === "games") rest.scenario_id = normalizeScenarioId(rest.scenario_id) ?? rest.scenario_id;
        return rest;
      })
      .filter((r: any) => {
        if (table === "games" && _currentUserId && r.host_user_id && r.host_user_id !== _currentUserId) {
          store.journal({ op: "push", table, ids: [r.id], ok: false, msg: "skipped foreign game" });
          succeeded.push({ table, id: r.id });
          return false;
        }
        return true;
      });

    for (const r of sanitized) snapshot.set(`${table}:${r.id}`, JSON.stringify(r));

    const ownedTables: Partial<Record<TableName, "update" | "drop">> = {
      characters: "update",
      profiles: "drop",
      game_players: "drop",
      user_roles: "drop",
    };

    for (let i = 0; i < sanitized.length; i += 100) {
      const chunk = sanitized.slice(i, i + 100);
      const foreignMode = ownedTables[table];

      if (foreignMode && _currentUserId) {
        const own = chunk.filter((r: any) => r.user_id === _currentUserId);
        const foreign = chunk.filter((r: any) => r.user_id !== _currentUserId);

        await pushChunk(table, own, succeeded);

        if (foreign.length > 0) {
          if (foreignMode === "update") {
            // SYNC-04: use .select("id") so 0-row RLS-rejected updates are visible.
            for (const row of foreign) {
              const { id, user_id, created_at, ...patch } = row as any;
              try {
                const { data: updated, error } = await (supabase.from(table as any).update(patch).eq("id", id).select("id") as any);
                if (error) {
                  handleRowFailure(table, row, error);
                } else if (!updated || updated.length === 0) {
                  // RLS rejected — quarantine local copy, pull server truth.
                  store.quarantineRow(table, id, "rls-rejected", { message: "Change refused by the server (no permission)" });
                  pullTable(table, { id }).catch(() => {});
                } else {
                  succeeded.push({ table, id });
                }
              } catch (e: any) {
                handleRowFailure(table, row, { message: e?.message ?? String(e) });
              }
            }
          } else {
            // "drop" — no policy permits the write; quarantine (invariant 1: never silent).
            for (const row of foreign) {
              store.quarantineRow(table, row.id, "foreign-owner", { message: `No permission to write this ${table} row` });
            }
          }
        }
      } else {
        await pushChunk(table, chunk, succeeded);
      }
    }
  }

  // SYNC-12: only clear dirty for rows whose content matches the pushed snapshot.
  const clearable = succeeded.filter(({ table, id }) => {
    const current = store.getTableRaw(table).find((r: any) => r.id === id);
    if (!current) return true; // row gone locally — nothing more to push
    const key = `${table}:${id}`;
    const snap = snapshot.get(key);
    if (!snap) return true;
    const { pending_sync, ...stripped } = current as any;
    return JSON.stringify(stripped) === snap;
  });

  // For games rows, patch pending_sync = false via mergeCleanRow (SYNC-12).
  for (const { table, id } of clearable) {
    if (table !== "games") continue;
    const cur = store.getTableRaw("games").find((r: any) => r.id === id) as any;
    if (cur?.pending_sync) store.mergeCleanRow("games", { id, pending_sync: false });
  }

  store.clearDirtyFor(clearable);

  if (clearable.length < succeeded.length) {
    scheduleRetry(); // rows edited mid-flight need another attempt
  }

  const stillDirty = store.getDirtyRows().length;
  store.journal({ op: "push", ok: true, msg: `synced=${clearable.length} pending=${stillDirty}` });
  if (stillDirty > 0) scheduleRetry();
}

// --- Public API ---

let _currentUserId: string | undefined;

export function setCurrentUserId(userId: string | undefined) {
  _currentUserId = userId;
}

export async function pullAll(userId?: string): Promise<void> {
  return enqueueSync(async () => {
    if (!(await ensureSession())) return;
    try {
      await doPull(userId ?? _currentUserId);
    } catch (e: any) {
      console.warn("Pull failed:", e);
      emitSyncError("pull", e?.message ?? String(e));
    }
  });
}

/** Pull a single table with optional filter. */
export async function pullTable(table: TableName, filter?: Record<string, any>): Promise<void> {
  return enqueueSync(async () => {
    if (!(await ensureSession())) return;
    await Promise.race([purgeSwRestCaches(), new Promise<void>((r) => setTimeout(r, 2000))]);
    try {
      let query = supabase.from(table as any).select("*");
      if (filter) {
        for (const [key, val] of Object.entries(filter)) {
          query = (query as any).eq(key, val);
        }
      }
      const { data, error } = await query;
      if (error) {
        emitSyncError(table, error.message);
        store.journal({ op: "pullTable", table, ok: false, msg: error.message });
        return;
      }
      if (data) {
        if (filter) store.replaceBy(table, filter, data as any);
        else store.mergeTable(table, data as any);
      }
    } catch (e: any) {
      console.warn(`pullTable ${table} failed:`, e);
      emitSyncError(table, e?.message ?? String(e));
    }
  });
}

export async function pushAll(): Promise<void> {
  return enqueueSync(async () => {
    if (!(await ensureSession())) return;
    try {
      await doPush();
    } catch (e: any) {
      console.warn("Sync failed:", e);
      emitSyncError("push", e?.message ?? String(e));
    }
  });
}

// --- Retry scheduler (SYNC-10) ---

let _pushTimer: ReturnType<typeof setTimeout> | null = null;
let _retryTimer: ReturnType<typeof setTimeout> | null = null;
let _listenerAttached = false;

function scheduleRetry() {
  if (_retryTimer) return;
  // Wake at the earliest nextAttemptAt (or 30s fallback).
  const now = Date.now();
  let earliest = now + 30_000;
  for (const { key, meta } of store.getAllOutboxMeta()) {
    if (meta.nextAttemptAt && meta.nextAttemptAt < earliest) earliest = meta.nextAttemptAt;
    void key;
  }
  const delay = Math.max(5_000, earliest - now);
  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    if (store.getDirtyRows().length > 0) pushAll();
  }, delay);
}

/** Debounced push — call after every local mutation */
export function triggerPush() {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => {
    if (navigator.onLine) pushAll();
    else scheduleRetry();
  }, 2000);
}

/** Attach reconnect / visibility listeners (call once at app start). */
export function attachOnlineListener() {
  if (_listenerAttached) return;
  _listenerAttached = true;

  window.addEventListener("online", () => {
    // SYNC-11: pull-before-push shrinks the clobber window.
    pullAll().then(() => pushAll());
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      pullAll().then(() => pushAll());
    }
  });

  // Kick a background retry loop when we come online with a non-empty queue.
  if (navigator.onLine && store.getDirtyRows().length > 0) scheduleRetry();
}
