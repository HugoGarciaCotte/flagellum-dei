import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateDescription(title: string, content: string): Promise<string | null> {
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return null;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a TTRPG content summarizer. Given a scenario's title and wiki content, write a single short sentence (under 20 words) summarizing the scenario's premise, suitable for a compact list view.",
          },
          {
            role: "user",
            content: `Title: ${title}\n\nContent:\n${content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_description",
              description: "Set the generated description for this scenario.",
              parameters: {
                type: "object",
                properties: {
                  description: { type: "string" },
                },
                required: ["description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_description" } },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return args.description || null;
    }
    return null;
  } catch {
    return null;
  }
}

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

    // Step 1: Get all pages in Category:Official Scenarios
    const catUrl =
      "https://prima.wiki/api.php?action=query&list=categorymembers&cmtitle=Category:Official%20Scenarios&cmlimit=500&format=json";
    const catRes = await fetch(catUrl);
    const catData = await catRes.json();
    const pages = catData?.query?.categorymembers || [];

    if (pages.length === 0) {
      return new Response(JSON.stringify({ success: true, items: [], total: 0, message: "No scenarios found in category" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all existing scenarios (include description)
    const { data: existingScenarios } = await adminClient
      .from("scenarios")
      .select("id, title, content, description");
    const existingMap = new Map(
      (existingScenarios || []).map((s: any) => [s.title, s])
    );

    // Step 2: Fetch each page content
    const items: { title: string; status: "new" | "modified" | "unchanged" }[] = [];
    const pageContents: Map<string, string> = new Map();

    for (const page of pages) {
      try {
        const title = page.title as string;
        const pageUrl = `https://prima.wiki/api.php?action=expandtemplates&title=${encodeURIComponent(title)}&text={{:${encodeURIComponent(title)}}}&prop=wikitext&format=json`;
        const pageRes = await fetch(pageUrl);
        const pageData = await pageRes.json();

        const content = pageData?.expandtemplates?.wikitext || "";
        if (!content) continue;
        // Extract scenario_level from metadata tag
        const levelMatch = content.match(/<!--@\s*scenario_level:\s*(\d+)\s*@-->/);
        const scenarioLevel = levelMatch ? parseInt(levelMatch[1], 10) : null;
        pageContents.set(title, content);
        // Store level alongside content for later use
        (pageContents as any).__levels = (pageContents as any).__levels || new Map();
        (pageContents as any).__levels.set(title, scenarioLevel);

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

    // Execute mode: upsert only new + modified, generate AI descriptions in parallel batches
    let imported = 0;
    const errors: string[] = [];
    const toProcess = items.filter((i) => i.status !== "unchanged");

    const BATCH_SIZE = 5;
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const content = pageContents.get(item.title) || "";
          const scenarioLevel = (pageContents as any).__levels?.get(item.title) ?? null;
          const existing = existingMap.get(item.title);

          const existingDescription = existing?.description;
          const needsDescription = !existingDescription || existingDescription.trim() === "" || existingDescription === "Imported from prima.wiki";
          let description: string | null = existingDescription || null;

          if (needsDescription) {
            description = await generateDescription(item.title, content);
          }

          if (existing) {
            await adminClient
              .from("scenarios")
              .update({ content, description: description || "Imported from prima.wiki", level: scenarioLevel })
              .eq("id", existing.id);
          } else {
            await adminClient
              .from("scenarios")
              .insert({ title: item.title, content, description: description || "Imported from prima.wiki", level: scenarioLevel });
          }
          return item.title;
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") imported++;
        else errors.push(r.reason?.message || "Unknown error");
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
