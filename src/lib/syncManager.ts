import { supabase } from "@/integrations/supabase/client";
import * as store from "./localStore";
import type { TableName } from "./localStore";

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

  // Phase 2: parallel — games, own profile
  const gamesQuery = withSince(
    supabase.from("games").select("*")
      .neq("status", "ended")
      .or(`host_user_id.eq.${userId}${playerGameIds.length > 0 ? `,id.in.(${playerGameIds.join(",")})` : ""}`),
    since,
  );
  const profileQuery = withSince(supabase.from("profiles").select("*").eq("user_id", userId), since);

  const [gamesRes, profileRes] = await Promise.all([gamesQuery, profileQuery]);

  if (gamesRes.data) merge("games", gamesRes.data);
  if (profileRes.data) merge("profiles", profileRes.data);

  const activeGameIds = (gamesRes.data ?? []).map((g: any) => g.id);
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

  // Phase 4: characters + feats + subfeats
  const charUserIdArr = [...charUserIds];
  const [charsRes] = await Promise.all([
    withSince(supabase.from("characters").select("*").in("user_id", charUserIdArr), since),
  ]);

  if (charsRes.data) {
    merge("characters", charsRes.data);
  }

  // Get all character IDs (from cache for incremental)
  const allChars = store.getTable("characters");
  const charIds = allChars.map((c: any) => c.id);

  if (charIds.length > 0) {
    const [featsRes, subfeatsRes] = await Promise.all([
      withSince(supabase.from("character_feats").select("*").in("character_id", charIds), since),
      // For subfeats, we need feat IDs — fetch all and filter client-side for simplicity
      withSince(supabase.from("character_feat_subfeats").select("*"), since),
    ]);

    if (featsRes.data) merge("character_feats", featsRes.data);
    if (subfeatsRes.data) {
      // Filter to only relevant character feats
      const allFeats = store.getTableRaw("character_feats");
      const featIdSet = new Set(allFeats.map((f: any) => f.id));
      const relevantSubfeats = subfeatsRes.data.filter((s: any) => featIdSet.has(s.character_feat_id));
      merge("character_feat_subfeats", relevantSubfeats);
    }
  } else if (!isIncremental) {
    store.setTable("character_feats", []);
    store.setTable("character_feat_subfeats", []);
  }

  store.setLastSync(now);
  store.evictStaleGames();
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
  const pushOrder: TableName[] = [
    "profiles", "user_roles", "characters", "character_feats",
    "character_feat_subfeats", "games", "game_players",
  ];

  for (const table of pushOrder) {
    const ids = byTable.get(table);
    if (!ids || ids.length === 0) continue;

    const allRows = store.getTableRaw(table);
    const rows = allRows.filter((r: any) => ids.includes(r.id));
    if (rows.length === 0) continue;

    try {
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        await (supabase.from(table as any).upsert(chunk as any, { onConflict: "id" }) as any);
      }
    } catch (e) {
      console.warn(`Push ${table} failed:`, e);
    }
  }

  store.clearDirty();
}

// --- Public API ---

let _currentUserId: string | undefined;

export function setCurrentUserId(userId: string | undefined) {
  _currentUserId = userId;
}

export async function pullAll(userId?: string): Promise<void> {
  if (_syncing) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPull(userId ?? _currentUserId);
  } catch (e) {
    console.warn("Pull failed:", e);
  } finally {
    _syncing = false;
    notify("synced");
  }
}

/** Pull a single table with optional filter, then merge into local store */
export async function pullTable(table: TableName, filter?: Record<string, any>): Promise<void> {
  try {
    let query = supabase.from(table as any).select("*");
    if (filter) {
      for (const [key, val] of Object.entries(filter)) {
        query = (query as any).eq(key, val);
      }
    }
    const { data } = await query;
    if (data) store.mergeTable(table, data as any);
  } catch (e) {
    console.warn(`pullTable ${table} failed:`, e);
  }
}

export async function pushAll(): Promise<void> {
  if (_syncing) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPush();
  } catch (e) {
    console.warn("Sync failed:", e);
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
