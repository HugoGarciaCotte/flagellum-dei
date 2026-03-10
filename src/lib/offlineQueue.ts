import { supabase } from "@/integrations/supabase/client";

const QUEUE_KEY = "qs_offline_queue";
const CACHE_PREFIX = "oq_";

export interface QueuedAction {
  id: string;
  timestamp: number;
  table: string;
  operation: "insert" | "update" | "delete" | "upsert";
  payload: Record<string, any>;
  tempId?: string;
  filter?: Record<string, any>;
  /** If insert used .select().single(), we need to delete first (for upsert patterns) */
  deleteBefore?: { table: string; filter: Record<string, any> };
}

// --- Queue management ---

export function getQueuedActions(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(actions: QueuedAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(actions));
}

export function queueAction(action: Omit<QueuedAction, "id" | "timestamp">): string {
  const actions = getQueuedActions();
  const id = crypto.randomUUID();
  actions.push({ ...action, id, timestamp: Date.now() });
  saveQueue(actions);
  window.dispatchEvent(new Event("offline-queue-change"));
  return id;
}

export function getQueueLength(): number {
  return getQueuedActions().length;
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new Event("offline-queue-change"));
}

// --- Temp ID remapping ---

/** After an insert resolves with a real ID, remap all queued references */
function remapTempId(actions: QueuedAction[], tempId: string, realId: string) {
  for (const action of actions) {
    // Remap in payload
    for (const key of Object.keys(action.payload)) {
      if (action.payload[key] === tempId) action.payload[key] = realId;
    }
    // Remap in filter
    if (action.filter) {
      for (const key of Object.keys(action.filter)) {
        if (action.filter[key] === tempId) action.filter[key] = realId;
      }
    }
    if (action.deleteBefore?.filter) {
      for (const key of Object.keys(action.deleteBefore.filter)) {
        if (action.deleteBefore.filter[key] === tempId) action.deleteBefore.filter[key] = realId;
      }
    }
  }
}

// --- Process queue on reconnect ---

export async function processQueue(): Promise<{ success: number; failed: number }> {
  const actions = getQueuedActions();
  if (actions.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  const remaining: QueuedAction[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    try {
      // Handle delete-before pattern (e.g., upsert = delete + insert)
      if (action.deleteBefore) {
        let q = supabase.from(action.deleteBefore.table).delete();
        for (const [k, v] of Object.entries(action.deleteBefore.filter)) {
          q = q.eq(k, v);
        }
        await q;
      }

      if (action.operation === "insert") {
        const { data, error } = await supabase
          .from(action.table)
          .insert(action.payload)
          .select()
          .single();
        if (error) throw error;
        // Remap temp ID in all remaining actions
        if (action.tempId && data?.id) {
          remapTempId(actions.slice(i + 1), action.tempId, data.id);
        }
      } else if (action.operation === "update") {
        let q = supabase.from(action.table).update(action.payload);
        if (action.filter) {
          for (const [k, v] of Object.entries(action.filter)) {
            q = q.eq(k, v);
          }
        }
        const { error } = await q;
        if (error) throw error;
      } else if (action.operation === "delete") {
        let q = supabase.from(action.table).delete();
        if (action.filter) {
          for (const [k, v] of Object.entries(action.filter)) {
            q = q.eq(k, v);
          }
        }
        const { error } = await q;
        if (error) throw error;
      }
      success++;
    } catch (e) {
      console.error("Offline queue action failed:", action, e);
      failed++;
      remaining.push(action);
    }
  }

  saveQueue(remaining);
  window.dispatchEvent(new Event("offline-queue-change"));
  return { success, failed };
}

// --- localStorage query cache ---

export function setCacheData(key: string, data: any) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to cache query data:", e);
  }
}

export function getCacheData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// --- Auto-sync on reconnect ---

let listenerAttached = false;

export function attachOnlineListener(onSynced: () => void) {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener("online", async () => {
    if (getQueueLength() === 0) return;
    window.dispatchEvent(new CustomEvent("offline-queue-syncing"));
    const result = await processQueue();
    if (result.success > 0) {
      onSynced();
    }
    window.dispatchEvent(new CustomEvent("offline-queue-synced", { detail: result }));
  });
}
