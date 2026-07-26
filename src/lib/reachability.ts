/**
 * FIX_SPEC_UNSTICK §2.3 reachability probe.
 * B-01: retry attempts count only when the server was recently reachable but
 * still rejected/failed. Prevents offline / lie-fi / captive-portal edits
 * from counting toward the quarantine cap.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

let _last: { at: number; ok: boolean } | null = null;
let _inflight: Promise<boolean> | null = null;

/** Returns true if a recent probe (≤maxAgeMs) succeeded, else runs a new one. */
export async function isReachable(maxAgeMs = 60_000): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const now = Date.now();
  if (_last && now - _last.at < maxAgeMs) return _last.ok;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      if (!SUPABASE_URL) return true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        _last = { at: Date.now(), ok: res.ok };
        return res.ok;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      _last = { at: Date.now(), ok: false };
      return false;
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

/** Read the cached probe result without triggering a new one. */
export function lastReachable(): boolean | null {
  return _last?.ok ?? null;
}
