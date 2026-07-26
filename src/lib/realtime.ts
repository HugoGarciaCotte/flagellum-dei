// A-06 / CROSS-02: realtime subscription with SUBSCRIBED catch-up and error surfacing.
import { supabase } from "@/integrations/supabase/client";
import { appendSyncError } from "./localStore";

type Binding = {
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema: string;
  table: string;
  filter?: string;
  handler: (payload: any) => void | Promise<void>;
};

/**
 * Subscribe with:
 *  - onCatchup fired on SUBSCRIBED (initial + every reconnect) so consumers
 *    can perform a full targeted pull and heal any missed events.
 *  - CHANNEL_ERROR / TIMED_OUT reported into the sync-issues panel.
 */
export function subscribeWithCatchup(
  channelName: string,
  bindings: Binding[],
  onCatchup?: () => void | Promise<void>,
): () => void {
  let channel = supabase.channel(channelName);
  for (const b of bindings) {
    channel = channel.on(
      "postgres_changes" as any,
      { event: b.event, schema: b.schema, table: b.table, ...(b.filter ? { filter: b.filter } : {}) } as any,
      (payload: any) => { try { b.handler(payload); } catch {} },
    );
  }
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      try { onCatchup?.(); } catch {}
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      appendSyncError({ table: "realtime", ids: [], message: `${channelName}: ${status}` });
    }
  });
  return () => { supabase.removeChannel(channel); };
}
