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
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // Parse mode from body
    let mode = "execute";
    try {
      const body = await req.json();
      if (body?.mode) mode = body.mode;
    } catch {
      // no body = default execute
    }

    // Step 1: Get all pages in Category:Scenario
    const catUrl =
      "https://prima.wiki/api.php?action=query&list=categorymembers&cmtitle=Category:Scenario&cmlimit=500&format=json";
    const catRes = await fetch(catUrl);
    const catData = await catRes.json();
    const pages = catData?.query?.categorymembers || [];

    if (pages.length === 0) {
      return new Response(JSON.stringify({ success: true, items: [], total: 0, message: "No scenarios found in category" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all existing scenarios in one query
    const { data: existingScenarios } = await adminClient
      .from("scenarios")
      .select("id, title, content");
    const existingMap = new Map(
      (existingScenarios || []).map((s: any) => [s.title, s])
    );

    // Step 2: Fetch each page content
    const items: { title: string; status: "new" | "modified" | "unchanged" }[] = [];
    const pageContents: Map<string, string> = new Map();

    for (const page of pages) {
      try {
        const title = page.title as string;
        const pageUrl = `https://prima.wiki/api.php?action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=content&format=json`;
        const pageRes = await fetch(pageUrl);
        const pageData = await pageRes.json();

        const pagesObj = pageData?.query?.pages;
        if (!pagesObj) continue;

        const pageId = Object.keys(pagesObj)[0];
        const revisions = pagesObj[pageId]?.revisions;
        if (!revisions || revisions.length === 0) continue;

        const content = revisions[0]["*"] || revisions[0]?.content || "";
        pageContents.set(title, content);

        const existing = existingMap.get(title);
        if (!existing) {
          items.push({ title, status: "new" });
        } else if (existing.content !== content) {
          items.push({ title, status: "modified" });
        } else {
          items.push({ title, status: "unchanged" });
        }
      } catch (e) {
        items.push({ title: page.title, status: "new" });
      }
    }

    // Preview mode: return the list without writing
    if (mode === "preview") {
      return new Response(
        JSON.stringify({ success: true, items, total: items.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute mode: upsert only new + modified
    let imported = 0;
    const errors: string[] = [];

    for (const item of items) {
      if (item.status === "unchanged") continue;
      try {
        const content = pageContents.get(item.title) || "";
        const existing = existingMap.get(item.title);

        if (existing) {
          await adminClient
            .from("scenarios")
            .update({ content, description: "Imported from prima.wiki" })
            .eq("id", existing.id);
        } else {
          await adminClient
            .from("scenarios")
            .insert({ title: item.title, content, description: "Imported from prima.wiki" });
        }
        imported++;
      } catch (e: any) {
        errors.push(`Error processing ${item.title}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, total: pages.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
