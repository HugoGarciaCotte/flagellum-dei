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

async function doPull(userId?: string) {
  if (!userId) {
    // Fallback: only pull user_roles (minimal)
    const { data } = await supabase.from("user_roles").select("*");
    if (data) store.setTable("user_roles", data);
    return;
  }

  // 1. User roles — only own
  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", userId);
  if (roles) store.setTable("user_roles", roles);

  // 2. Games — only non-ended where user is host or player
  const { data: playerRows } = await supabase
    .from("game_players")
    .select("game_id")
    .eq("user_id", userId);
  const playerGameIds = (playerRows ?? []).map((r: any) => r.game_id);

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .neq("status", "ended")
    .or(`host_user_id.eq.${userId}${playerGameIds.length > 0 ? `,id.in.(${playerGameIds.join(",")})` : ""}`);
  if (games) store.setTable("games", games);

  const activeGameIds = (games ?? []).map((g: any) => g.id);

  // 3. Game players — only for active games
  if (activeGameIds.length > 0) {
    const { data: gamePlayers } = await supabase
      .from("game_players")
      .select("*")
      .in("game_id", activeGameIds);
    if (gamePlayers) store.setTable("game_players", gamePlayers);

    // Collect all user IDs from active games for profiles
    const allUserIds = [...new Set((gamePlayers ?? []).map((p: any) => p.user_id as string).concat(userId))];

    // 4. Profiles — only relevant users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", allUserIds);
    if (profiles) store.setTable("profiles", profiles);

    // Collect character IDs needed
    const playerCharacterUserIds = allUserIds;

    // 5. Characters — own + players in active games
    const { data: characters } = await supabase
      .from("characters")
      .select("*")
      .in("user_id", playerCharacterUserIds);
    if (characters) {
      store.setTable("characters", characters);
      const charIds = characters.map((c: any) => c.id);

      if (charIds.length > 0) {
        // 6. Character feats
        const { data: feats } = await supabase
          .from("character_feats")
          .select("*")
          .in("character_id", charIds);
        if (feats) {
          store.setTable("character_feats", feats);
          const featIds = feats.map((f: any) => f.id);

          // 7. Character feat subfeats
          if (featIds.length > 0) {
            const { data: subfeats } = await supabase
              .from("character_feat_subfeats")
              .select("*")
              .in("character_feat_id", featIds);
            if (subfeats) store.setTable("character_feat_subfeats", subfeats);
          } else {
            store.setTable("character_feat_subfeats", []);
          }
        } else {
          store.setTable("character_feats", []);
          store.setTable("character_feat_subfeats", []);
        }
      } else {
        store.setTable("character_feats", []);
        store.setTable("character_feat_subfeats", []);
      }
    } else {
      store.setTable("characters", []);
      store.setTable("character_feats", []);
      store.setTable("character_feat_subfeats", []);
    }
  } else {
    store.setTable("game_players", []);
    // Still fetch own characters even without active games
    const { data: characters } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userId);
    if (characters) {
      store.setTable("characters", characters);
      const charIds = characters.map((c: any) => c.id);
      if (charIds.length > 0) {
        const { data: feats } = await supabase
          .from("character_feats")
          .select("*")
          .in("character_id", charIds);
        if (feats) {
          store.setTable("character_feats", feats);
          const featIds = feats.map((f: any) => f.id);
          if (featIds.length > 0) {
            const { data: subfeats } = await supabase
              .from("character_feat_subfeats")
              .select("*")
              .in("character_feat_id", featIds);
            if (subfeats) store.setTable("character_feat_subfeats", subfeats);
          } else {
            store.setTable("character_feat_subfeats", []);
          }
        } else {
          store.setTable("character_feats", []);
          store.setTable("character_feat_subfeats", []);
        }
      } else {
        store.setTable("character_feats", []);
        store.setTable("character_feat_subfeats", []);
      }
    } else {
      store.setTable("characters", []);
      store.setTable("character_feats", []);
      store.setTable("character_feat_subfeats", []);
    }

    // Own profile
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId);
    if (profiles) store.setTable("profiles", profiles);
  }

  // Evict stale ended games that may linger in local store
  store.evictStaleGames();
}

async function doPush() {
  // 1. Process tracked deletions
  const deletions = store.getDeletions();
  for (const { table, id } of deletions) {
    try {
      await (supabase.from(table as any).delete() as any).eq("id", id);
    } catch {
      // Row may not exist on server — ignore
    }
  }
  store.clearDeletions();

  // 2. Upsert in FK-dependency order (skip profiles — server trigger creates those)
  const pushOrder: TableName[] = [
    "user_roles", "characters", "character_feats",
    "character_feat_subfeats", "games", "game_players",
  ];

  for (const table of pushOrder) {
    const rows = store.getTable(table);
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
}

export async function pullAll(userId?: string): Promise<void> {
  if (_syncing) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPull(userId);
  } catch (e) {
    console.warn("Pull failed:", e);
  } finally {
    _syncing = false;
    notify("synced");
  }
}

let _currentUserId: string | undefined;

export function setCurrentUserId(userId: string | undefined) {
  _currentUserId = userId;
}

export async function pushAll(): Promise<void> {
  if (_syncing) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPush();
    await doPull(_currentUserId); // refresh with server state
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
    pushAll();
  });
}
