/**
 * LOG-01 (remote half): fire-and-forget shipping of sync errors to the
 * `sync_errors` table so the GM can inspect players' failures after a session.
 *
 * Hard rules:
 *  - NEVER throws into the app; every path is wrapped.
 *  - NEVER calls appendSyncError about its own failures (no recursion) —
 *    upload problems go to console.debug only.
 *  - NEVER blocks sync: inserts happen outside the sync mutex, best-effort.
 *  - Errors mostly occur while the network is broken, so entries are queued
 *    in localStorage and flushed when connectivity is proven (online event,
 *    successful sync cycle) or on a debounce after enqueue.
 *  - Local guests / signed-out users have no session: entries stay queued
 *    (capped) until a session exists. The queue is dropped on user switch
 *    (localStore.clearAll) so entries aren't attributed to the wrong user.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  setSyncErrorForwarder,
  SYNC_ERROR_OUTBOX_KEY,
  type SyncError,
} from "./localStore";

const OUTBOX_CAP = 200;
const FLUSH_BATCH = 50;
const FLUSH_DEBOUNCE_MS = 10_000;
const COLLAPSE_WINDOW_MS = 5 * 60_000;

type OutboxEntry = SyncError & { count: number };

// Set when the server rejects inserts for a non-transient reason (table not
// migrated yet, RLS denial). Remote logging stays off for this page load;
// the queue is kept so a later session can retry.
let _disabledReason: string | null = null;
export function remoteLogDisabledReason() { return _disabledReason; }

function loadOutbox(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(SYNC_ERROR_OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
  } catch { return []; }
}

function saveOutbox(list: OutboxEntry[]) {
  try { localStorage.setItem(SYNC_ERROR_OUTBOX_KEY, JSON.stringify(list)); } catch { /* quota — drop */ }
}

/** Queue an error for upload (newest first, duplicates collapsed, oldest dropped past cap). */
export function enqueueSyncErrorUpload(e: SyncError) {
  const list = loadOutbox();
  const head = list[0];
  if (
    head &&
    head.table === e.table &&
    head.message === e.message &&
    Math.abs(new Date(e.at).getTime() - new Date(head.at).getTime()) < COLLAPSE_WINDOW_MS
  ) {
    list[0] = { ...head, at: e.at, count: head.count + 1 };
  } else {
    list.unshift({ ...e, count: e.count ?? 1 });
  }
  saveOutbox(list.slice(0, OUTBOX_CAP));
}

function isTerminalUploadError(err: { code?: string; message?: string; status?: number } | null | undefined): boolean {
  if (!err) return false;
  // Table missing (migration not applied), schema cache miss, or RLS denial.
  if (err.code && ["42P01", "42501", "PGRST106", "PGRST204", "PGRST205"].includes(err.code)) return true;
  const msg = (err.message ?? "").toLowerCase();
  return /relation .* does not exist|could not find the table|schema cache|row-level security/.test(msg);
}

let _flushing = false;

/** Best-effort upload of queued errors. Safe to call anytime; never throws. */
export async function flushSyncErrorUploads(): Promise<void> {
  if (_flushing || _disabledReason) return;
  _flushing = true;
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // local guest / signed out — keep queue for later
    // Loop in batches until drained or a failure stops us.
    for (;;) {
      const list = loadOutbox();
      if (list.length === 0) return;
      const batch = list.slice(-FLUSH_BATCH); // oldest entries first
      const rows = batch.map((e) => ({
        at: e.at,
        table_name: e.table,
        row_ids: e.ids ?? [],
        message: e.message.slice(0, 500),
        count: e.count ?? 1,
        device: {
          ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
          online: typeof navigator !== "undefined" ? navigator.onLine : null,
        },
        // user_id is defaulted to auth.uid() server-side.
      }));
      const { error } = await (supabase.from("sync_errors" as any).insert(rows as any) as any);
      if (error) {
        if (isTerminalUploadError(error)) {
          _disabledReason = error.message ?? String(error.code);
          console.debug("[sync-error-reporter] remote logging disabled:", _disabledReason);
        }
        return; // transient: keep queue, retry on next trigger
      }
      // Reload before trimming: appendSyncError may have PREPENDED entries during
      // the await; the uploaded batch is still exactly the last `batch.length`.
      // (Two tabs flushing at once can double-insert — acceptable for a log.)
      const after = loadOutbox();
      saveOutbox(after.slice(0, Math.max(0, after.length - batch.length)));
    }
  } catch (e) {
    console.debug("[sync-error-reporter] flush failed:", e);
  } finally {
    _flushing = false;
  }
}

let _initialized = false;
let _debounce: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (_debounce) return;
  _debounce = setTimeout(() => {
    _debounce = null;
    void flushSyncErrorUploads();
  }, FLUSH_DEBOUNCE_MS);
}

/** Wire the reporter into localStore. Call once at app start. */
export function initSyncErrorReporter() {
  if (_initialized) return;
  _initialized = true;
  setSyncErrorForwarder((e) => {
    enqueueSyncErrorUpload(e);
    scheduleFlush();
  });
  try {
    window.addEventListener("online", () => scheduleFlush());
    // A finished sync cycle proves the server is reachable — good moment to drain.
    window.addEventListener("sync-synced", () => scheduleFlush());
  } catch { /* non-browser env */ }
  // Drain anything left over from a previous session shortly after boot.
  setTimeout(() => { void flushSyncErrorUploads(); }, 5_000);
}
