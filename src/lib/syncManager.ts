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

// --- Pull (full snapshot — simple & robust) ---
//
// Strategy: every pull is a complete snapshot of the user's visible scope.
// No incremental `since` filter, no merge/eviction, no overlay logic.
// Data volume is tiny (a few KB) and RLS decides what we see.

async function doPull(userId?: string) {
  const now = new Date().toISOString();

  if (!userId) {
    const { data } = await supabase.from("user_roles").select("*");
    store.setTableKeepDirty("user_roles", data ?? []);
    store.setLastSync(now);
    return;
  }

  // Step 1: roles + game refs + hosted games + own profile, in parallel.
  const [rolesRes, playerRefsRes, hostedRes, profileRes] = await Promise.all([
    supabase.from("user_roles").select("*").eq("user_id", userId),
    supabase.from("game_players").select("game_id").eq("user_id", userId),
    supabase.from("games").select("*").eq("host_user_id", userId),
    supabase.from("profiles").select("*").eq("user_id", userId),
  ]);

  store.setTableKeepDirty("user_roles", rolesRes.data ?? []);

  const playedGameIds = (playerRefsRes.data ?? []).map((r: any) => r.game_id);
  const hostedGames = hostedRes.data ?? [];

  // Step 2: played games (active only)
  const playedGamesRes = playedGameIds.length > 0
    ? await supabase.from("games").select("*").neq("status", "ended").in("id", playedGameIds)
    : { data: [] as any[] };

  const gamesById = new Map<string, any>();
  for (const g of hostedGames) gamesById.set(g.id, g);
  for (const g of playedGamesRes.data ?? []) gamesById.set(g.id, g);
  store.setTableKeepDirty("games", [...gamesById.values()]);

  const allGameIds = [...gamesById.keys()];

  // Step 3: every game_player for every relevant game
  const gpRes = allGameIds.length > 0
    ? await supabase.from("game_players").select("*").in("game_id", allGameIds)
    : { data: [] as any[] };

  store.setTableKeepDirty("game_players", gpRes.data ?? []);

  // Step 4: characters + profiles for self + every game member
  const memberUserIds = new Set<string>([userId]);
  for (const p of gpRes.data ?? []) memberUserIds.add(p.user_id);
  const memberIdArr = [...memberUserIds];

  const [charsRes, profilesRes] = await Promise.all([
    supabase.from("characters").select("*").in("user_id", memberIdArr),
    supabase.from("profiles").select("*").in("user_id", memberIdArr),
  ]);

  if (charsRes.error) emitSyncError("characters", charsRes.error.message);
  if (profilesRes.error) emitSyncError("profiles", profilesRes.error.message);

  store.setTableKeepDirty("characters", charsRes.data ?? []);

  const profilesById = new Map<string, any>();
  if (profileRes.data) for (const p of profileRes.data) profilesById.set(p.user_id, p);
  for (const p of profilesRes.data ?? []) profilesById.set(p.user_id, p);
  store.setTableKeepDirty("profiles", [...profilesById.values()]);

  store.setLastSync(now);
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
