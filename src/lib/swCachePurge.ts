/**
 * ST-05 (§5.6): purge poisoned SW REST caches so a stale snapshot can never
 * be served in response to a pull. Old service workers still have these
 * caches populated; this module heals them at boot.
 */

const POISON_CACHES = ["supabase-api-cache", "scenario-api-cache"];

export const swRestCachePurged: Promise<void> = (async () => {
  try {
    if (typeof window !== "undefined" && "caches" in window) {
      await Promise.all(POISON_CACHES.map((n) => caches.delete(n).catch(() => false)));
    }
  } catch {}
})();

export async function purgeSwRestCaches(): Promise<void> {
  try {
    if (typeof window !== "undefined" && "caches" in window) {
      await Promise.all(POISON_CACHES.map((n) => caches.delete(n).catch(() => false)));
    }
  } catch {}
}
