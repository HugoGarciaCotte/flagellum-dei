import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheScenarios } from "@/lib/offlineStorage";

/**
 * Prefetches all scenarios for offline use.
 * Call once on Dashboard mount.
 */
export function useOfflineScenarios() {
  useEffect(() => {
    const prefetch = async () => {
      try {
        const { data } = await supabase.from("scenarios").select("*");
        if (data) cacheScenarios(data);
      } catch (e) {
        console.warn("Offline prefetch failed (probably offline):", e);
      }
    };

    if (navigator.onLine) {
      prefetch();
    }
  }, []);
}
