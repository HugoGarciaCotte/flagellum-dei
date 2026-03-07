import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheScenarios, cacheSections } from "@/lib/offlineStorage";

/**
 * Prefetches all scenarios and sections for offline use.
 * Call once on Dashboard mount.
 */
export function useOfflineScenarios() {
  useEffect(() => {
    const prefetch = async () => {
      try {
        const [scenariosRes, sectionsRes] = await Promise.all([
          supabase.from("scenarios").select("*"),
          supabase.from("scenario_sections").select("*").order("sort_order", { ascending: true }),
        ]);
        if (scenariosRes.data) cacheScenarios(scenariosRes.data);
        if (sectionsRes.data) cacheSections(sectionsRes.data);
      } catch (e) {
        console.warn("Offline prefetch failed (probably offline):", e);
      }
    };

    if (navigator.onLine) {
      prefetch();
    }
  }, []);
}
