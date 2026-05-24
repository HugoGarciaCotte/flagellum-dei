import { supabase } from "@/integrations/supabase/client";
import * as store from "./localStore";
import type { TableName } from "./localStore";
import { normalizeScenarioId } from "./scenarioIds";

const LOCAL_GUEST_KEY = "local-guest-user";

function emitSyncError(table: string, message: string) {
  try {
    window.dispatchEvent(new CustomEvent("sync-error", { detail: { table, ids: [], message } }));
  } catch {}
}

async function ensureSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return true;

  const localGuest = localStorage.getItem(LOCAL_GUEST_KEY);
  if (!localGuest || !navigator.onLine) return false;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("Session retry failed:", error.message);
    emitSyncError("session", error.message);
    return false;
  }
  return true;
}

let _syncing = false;
let _pushTimer: ReturnType<typeof setTimeout> | null = null;
let _listenerAttached = false;

export function isSyncing() {
  return _syncing;
}

function notify(type: "syncing" | "synced") {
  window.dispatchEvent(new CustomEvent(`sync-${type}`));
}

// --- Helpers ---

/** Build a query with optional incremental filter */
function withSince(query: any, since: string | null) {
  return since ? query.gte("updated_at", since) : query;
}

// --- Pull ---

async function doPull(userId?: string) {
  const since = store.getLastSync();
  const isIncremental = !!since;
  const merge = isIncremental ? store.mergeTable : store.setTable;
  const now = new Date().toISOString();

  if (!userId) {
    const { data } = await withSince(supabase.from("user_roles").select("*"), since);
    if (data) merge("user_roles", data);
    store.setLastSync(now);
    return;
  }

  // Phase 1: parallel — user_roles + game_players lookup
  const [rolesRes, playerRefsRes] = await Promise.all([
    withSince(supabase.from("user_roles").select("*").eq("user_id", userId), since),
    supabase.from("game_players").select("game_id").eq("user_id", userId),
  ]);

  if (rolesRes.data) merge("user_roles", rolesRes.data);
  const playerGameIds = (playerRefsRes.data ?? []).map((r: any) => r.game_id);

  // Phase 2: parallel — games (hosted: ALL statuses incl. ended; played: active only), own profile
  const hostedGamesQuery = withSince(
    supabase.from("games").select("*").eq("host_user_id", userId),
    since,
  );
  const playedGamesQuery = playerGameIds.length > 0
    ? withSince(
        supabase.from("games").select("*").neq("status", "ended").in("id", playerGameIds),
        since,
      )
    : Promise.resolve({ data: [] as any[] });
  const profileQuery = withSince(supabase.from("profiles").select("*").eq("user_id", userId), since);

  const [hostedRes, playedRes, profileRes] = await Promise.all([hostedGamesQuery, playedGamesQuery, profileQuery]);

  const gamesData = [...(hostedRes.data ?? []), ...(playedRes.data ?? [])];
  if (gamesData.length > 0) merge("games", gamesData);
  if (profileRes.data) merge("profiles", profileRes.data);


  const activeGameIds = gamesData.map((g: any) => g.id);
  // For incremental, also include games already in local store
  if (isIncremental) {
    const localGames = store.getTable("games");
    for (const g of localGames) {
      if (!activeGameIds.includes(g.id)) activeGameIds.push(g.id);
    }
  }

  // Phase 3: parallel — game_players (full), characters
  const charUserIds = new Set<string>([userId]);

  if (activeGameIds.length > 0) {
    const [gpRes] = await Promise.all([
      withSince(supabase.from("game_players").select("*").in("game_id", activeGameIds), since),
    ]);
    if (gpRes.data) {
      merge("game_players", gpRes.data);
      for (const p of gpRes.data) charUserIds.add(p.user_id);
    }

    // Fetch profiles for all game players
    const allUserIds = [...charUserIds];
    const [profilesRes] = await Promise.all([
      withSince(supabase.from("profiles").select("*").in("user_id", allUserIds), since),
    ]);
    if (profilesRes.data) merge("profiles", profilesRes.data);
  } else if (!isIncremental) {
    store.setTable("game_players", []);
  }

  // Phase 4: characters (feats live in characters.feats jsonb — no per-feat tables to pull)
  const charUserIdArr = [...charUserIds];

  // For OTHER users (game players, not self), always full-pull. Their characters
  // may have updated_at older than our lastSync (e.g. created before they joined
  // our game), so an incremental pull would miss them.
  // For SELF, use incremental to save bandwidth.
  const otherUserIds = charUserIdArr.filter((uid) => uid !== userId);
  const selfUserIds = charUserIdArr.filter((uid) => uid === userId);

  const charPulls: Promise<any>[] = [];
  if (selfUserIds.length > 0) {
    charPulls.push(
      Promise.resolve(withSince(supabase.from("characters").select("*").in("user_id", selfUserIds), since)),
    );
  }
  if (otherUserIds.length > 0) {
    charPulls.push(Promise.resolve(supabase.from("characters").select("*").in("user_id", otherUserIds)));
  }

  const charResults = await Promise.all(charPulls);
  const mergedChars: any[] = [];
  for (const res of charResults) {
    if (res?.error) emitSyncError("characters", res.error.message);
    if (res?.data) mergedChars.push(...res.data);
  }
  if (mergedChars.length > 0 || !isIncremental) merge("characters", mergedChars);

  store.setLastSync(now);
  store.evictStaleGames(userId);
}

// --- Push (dirty rows only) ---

async function doPush() {
  const dirtyRows = store.getDirtyRows();
  if (dirtyRows.length === 0) return;

  // Group by table
  const byTable = new Map<TableName, string[]>();
  for (const { table, id } of dirtyRows) {
    const ids = byTable.get(table) || [];
    ids.push(id);
    byTable.set(table, ids);
  }

  // Push in FK-dependency order
  // Push in FK-dependency order. character_feats / character_feat_subfeats
  // are no longer synced — feats now live in characters.feats (jsonb).
  const pushOrder: TableName[] = [
    "profiles", "user_roles", "characters", "games", "game_players",
  ];

  const succeeded: { table: TableName; id: string }[] = [];

  for (const table of pushOrder) {
    const ids = byTable.get(table);
    if (!ids || ids.length === 0) continue;

    const allRows = store.getTableRaw(table);
    const rows = allRows.filter((r: any) => ids.includes(r.id));
    if (rows.length === 0) continue;

    // Strip local-only flags before sending to DB
    const sanitized = rows.map((r: any) => {
      const { pending_sync, ...rest } = r;
      if (table === "games") rest.scenario_id = normalizeScenarioId(rest.scenario_id) ?? rest.scenario_id;
      return rest;
    });

    // Tables where rows are user-owned and the INSERT policy is `auth.uid() = user_id`.
    // For these tables, foreign rows can never be inserted by the current user.
    // - `characters` has a host UPDATE policy → foreign rows go through .update()
    // - `profiles`, `game_players`, `user_roles` have no host-write policy → drop the
    //   dirty flag for foreign rows so we don't retry-spam, and surface one sync-error.
    const ownedTables: Partial<Record<TableName, "update" | "drop">> = {
      characters: "update",
      profiles: "drop",
      game_players: "drop",
      user_roles: "drop",
    };

    for (let i = 0; i < sanitized.length; i += 100) {
      const chunk = sanitized.slice(i, i + 100);
      const chunkIds = chunk.map((r: any) => r.id);
      try {
        const foreignMode = ownedTables[table];
        if (foreignMode && _currentUserId) {
          const own = chunk.filter((r: any) => r.user_id === _currentUserId);
          const foreign = chunk.filter((r: any) => r.user_id !== _currentUserId);

          if (own.length > 0) {
            const ownIds = own.map((r: any) => r.id);
            const { error } = await (supabase.from(table as any).upsert(own as any, { onConflict: "id" }) as any);
            if (error) {
              console.error(`Push ${table} (own) failed:`, error.message, { ids: ownIds });
              store.appendSyncError({ table, ids: ownIds, message: error.message });
              window.dispatchEvent(new CustomEvent("sync-error", { detail: { table, ids: ownIds, message: error.message } }));
            } else {
              for (const r of own) succeeded.push({ table, id: r.id });
            }
          }

          if (foreign.length > 0) {
            if (foreignMode === "update") {
              for (const row of foreign) {
                const { id, user_id, created_at, ...patch } = row as any;
                const { error } = await (supabase.from(table as any).update(patch).eq("id", id) as any);
                if (error) {
                  console.error(`Push ${table} (foreign) failed:`, error.message, { ids: [id] });
                  store.appendSyncError({ table, ids: [id], message: error.message });
                  window.dispatchEvent(new CustomEvent("sync-error", { detail: { table, ids: [id], message: error.message } }));
                } else {
                  succeeded.push({ table, id });
                }
              }
            } else {
              // "drop": no policy permits this write — clear dirty flag so we don't loop.
              const foreignIds = foreign.map((r: any) => r.id);
              const msg = `Skipped pushing ${foreign.length} foreign ${table} row(s) — no write permission`;
              console.warn(msg, { ids: foreignIds });
              store.appendSyncError({ table, ids: foreignIds, message: msg });
              window.dispatchEvent(new CustomEvent("sync-error", { detail: { table, ids: foreignIds, message: msg } }));
              for (const id of foreignIds) succeeded.push({ table, id }); // succeeded → clearDirtyFor will drop it
            }
          }
        } else {
          const { error } = await (supabase.from(table as any).upsert(chunk as any, { onConflict: "id" }) as any);
          if (error) {
            console.error(`Push ${table} failed:`, error.message, { ids: chunkIds });
            store.appendSyncError({ table, ids: chunkIds, message: error.message });
            window.dispatchEvent(new CustomEvent("sync-error", {
              detail: { table, ids: chunkIds, message: error.message },
            }));
            continue; // leave dirty, retry later
          }
          for (const id of chunkIds) succeeded.push({ table, id });
        }
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error(`Push ${table} threw:`, msg, { ids: chunkIds });
        store.appendSyncError({ table, ids: chunkIds, message: msg });
        window.dispatchEvent(new CustomEvent("sync-error", {
          detail: { table, ids: chunkIds, message: msg },

        }));
      }
    }

    // Clear pending_sync on rows that pushed successfully
    if (table === "games") {
      const okIds = new Set(succeeded.filter(s => s.table === "games").map(s => s.id));
      for (const r of rows) {
        if (r.pending_sync && okIds.has(r.id)) store.upsertRow("games", { ...r, pending_sync: false });
      }
    }
  }

  store.clearDirtyFor(succeeded);
}

// --- Public API ---

let _currentUserId: string | undefined;

export function setCurrentUserId(userId: string | undefined) {
  _currentUserId = userId;
}

export async function pullAll(userId?: string): Promise<void> {
  if (_syncing) return;
  if (!(await ensureSession())) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPull(userId ?? _currentUserId);
  } catch (e: any) {
    console.warn("Pull failed:", e);
    emitSyncError("pull", e?.message ?? String(e));
  } finally {
    _syncing = false;
    notify("synced");
  }
}

/** Pull a single table with optional filter, then merge into local store */
export async function pullTable(table: TableName, filter?: Record<string, any>): Promise<void> {
  if (!(await ensureSession())) return;
  try {
    let query = supabase.from(table as any).select("*");
    if (filter) {
      for (const [key, val] of Object.entries(filter)) {
        query = (query as any).eq(key, val);
      }
    }
    const { data, error } = await query;
    if (error) emitSyncError(table, error.message);
    if (data) {
      if (filter) store.replaceBy(table, filter, data as any);
      else store.mergeTable(table, data as any);
    }
  } catch (e: any) {
    console.warn(`pullTable ${table} failed:`, e);
    emitSyncError(table, e?.message ?? String(e));
  }
}

export async function pushAll(): Promise<void> {
  if (_syncing) return;
  if (!(await ensureSession())) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPush();
  } catch (e: any) {
    console.warn("Sync failed:", e);
    emitSyncError("push", e?.message ?? String(e));
  } finally {
    _syncing = false;
    notify("synced");
  }
}

/** Debounced push — call after every local mutation */
export function triggerPush() {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => {
    if (navigator.onLine) pushAll();
  }, 2000);
}

/** Attach reconnect listener (call once at app start) */
export function attachOnlineListener() {
  if (_listenerAttached) return;
  _listenerAttached = true;
  window.addEventListener("online", () => {
    pushAll().then(() => pullAll());
  });
}
