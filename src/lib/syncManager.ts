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

async function doPull() {
  const tables: TableName[] = [
    "characters", "character_feats", "character_feat_subfeats",
    "games", "game_players", "profiles", "user_roles",
  ];

  const results = await Promise.all([
    supabase.from("characters").select("*"),
    supabase.from("character_feats").select("*"),
    supabase.from("character_feat_subfeats").select("*"),
    supabase.from("games").select("*"),
    supabase.from("game_players").select("*"),
    supabase.from("profiles").select("*"),
    supabase.from("user_roles").select("*"),
  ]);

  results.forEach((result, i) => {
    if (result.data) store.setTable(tables[i], result.data);
  });
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

export async function pullAll(): Promise<void> {
  if (_syncing) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPull();
  } catch (e) {
    console.warn("Pull failed:", e);
  } finally {
    _syncing = false;
    notify("synced");
  }
}

export async function pushAll(): Promise<void> {
  if (_syncing) return;
  _syncing = true;
  notify("syncing");
  try {
    await doPush();
    await doPull(); // refresh with server state
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
