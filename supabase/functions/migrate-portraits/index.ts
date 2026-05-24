import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * One-time (idempotent) migration: find characters whose portrait_url is an inline
 * base64 data: URI, upload the bytes to the character-portraits bucket, and replace
 * the column with the public URL. Safe to run multiple times.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Scan all characters with a data: URI portrait. Pull in pages of 100.
    let migrated = 0;
    let failed = 0;
    let scanned = 0;
    const errors: string[] = [];

    let from = 0;
    const pageSize = 100;
    while (true) {
      const { data: rows, error } = await admin
        .from("characters")
        .select("id, user_id, portrait_url")
        .like("portrait_url", "data:image/%")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!rows || rows.length === 0) break;
      scanned += rows.length;

      for (const row of rows) {
        try {
          const url: string = row.portrait_url as string;
          const match = url.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!match) {
            failed++;
            errors.push(`${row.id}: malformed data URI`);
            continue;
          }
          const ext = match[1] === "jpeg" ? "jpg" : match[1];
          const base64 = match[2];
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

          const filePath = `${row.user_id}/${row.id}.${ext}`;
          const { error: upErr } = await admin.storage
            .from("character-portraits")
            .upload(filePath, bytes, { contentType: `image/${match[1]}`, upsert: true });
          if (upErr) throw upErr;

          const { data: pub } = admin.storage
            .from("character-portraits")
            .getPublicUrl(filePath);
          const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;

          const { error: updErr } = await admin
            .from("characters")
            .update({ portrait_url: publicUrl })
            .eq("id", row.id);
          if (updErr) throw updErr;

          migrated++;
        } catch (e: any) {
          failed++;
          errors.push(`${row.id}: ${e.message ?? String(e)}`);
        }
      }

      if (rows.length < pageSize) break;
      // Don't bump `from` — we already updated the rows so the next query starts fresh at 0.
    }

    return new Response(
      JSON.stringify({ scanned, migrated, failed, errors: errors.slice(0, 20) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("migrate-portraits error:", e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
