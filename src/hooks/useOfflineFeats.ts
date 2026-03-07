import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheFeats } from "@/lib/offlineStorage";

/**
 * Prefetches all feats for offline use.
 * Call once on Dashboard mount.
 */
export function useOfflineFeats() {
  useEffect(() => {
    const prefetch = async () => {
      try {
        const { data } = await supabase
          .from("feats")
          .select("id, title, categories, content, raw_content")
          .order("title");
        if (data) cacheFeats(data);
      } catch (e) {
        console.warn("Offline feats prefetch failed:", e);
      }
    };

    if (navigator.onLine) {
      prefetch();
    }
  }, []);
}
