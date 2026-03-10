import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: feats } = await supabase
    .from("feats")
    .select("id, title, categories, content, raw_content")
    .order("title");

  const { data: redirects } = await supabase
    .from("feat_redirects")
    .select("from_title, to_title")
    .order("from_title");

  return new Response(JSON.stringify({ feats, redirects }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
