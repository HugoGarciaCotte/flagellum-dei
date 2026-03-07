import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is the owner
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check owner role using service client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: owner only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Get all pages in Category:Scenario
    const catUrl =
      "https://prima.wiki/api.php?action=query&list=categorymembers&cmtitle=Category:Scenario&cmlimit=500&format=json";
    const catRes = await fetch(catUrl);
    const catData = await catRes.json();
    const pages = catData?.query?.categorymembers || [];

    if (pages.length === 0) {
      return new Response(JSON.stringify({ success: true, imported: 0, message: "No scenarios found in category" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imported = 0;
    const errors: string[] = [];

    // Step 2: Fetch each page content and upsert
    for (const page of pages) {
      try {
        const title = page.title as string;
        const pageUrl = `https://prima.wiki/api.php?action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=content&format=json`;
        const pageRes = await fetch(pageUrl);
        const pageData = await pageRes.json();

        const pagesObj = pageData?.query?.pages;
        if (!pagesObj) {
          errors.push(`No data for ${title}`);
          continue;
        }

        const pageId = Object.keys(pagesObj)[0];
        const revisions = pagesObj[pageId]?.revisions;
        if (!revisions || revisions.length === 0) {
          errors.push(`No revisions for ${title}`);
          continue;
        }

        const content = revisions[0]["*"] || revisions[0]?.content || "";

        // Upsert by title
        const { data: existing } = await adminClient
          .from("scenarios")
          .select("id")
          .eq("title", title)
          .maybeSingle();

        if (existing) {
          await adminClient
            .from("scenarios")
            .update({ content, description: `Imported from prima.wiki` })
            .eq("id", existing.id);
        } else {
          await adminClient
            .from("scenarios")
            .insert({ title, content, description: `Imported from prima.wiki` });
        }

        imported++;
      } catch (e) {
        errors.push(`Error processing ${page.title}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, total: pages.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
