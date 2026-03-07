import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchCategoryMembers(category: string): Promise<string[]> {
  const titles: string[] = [];
  let cmcontinue: string | undefined;

  do {
    const url = new URL("https://prima.wiki/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "categorymembers");
    url.searchParams.set("cmtitle", `Category:${category}`);
    url.searchParams.set("cmlimit", "500");
    url.searchParams.set("format", "json");
    if (cmcontinue) url.searchParams.set("cmcontinue", cmcontinue);

    const res = await fetch(url.toString());
    const data = await res.json();
    const members = data?.query?.categorymembers || [];
    for (const m of members) {
      titles.push(m.title as string);
    }
    cmcontinue = data?.continue?.cmcontinue;
  } while (cmcontinue);

  return titles;
}

const CATEGORY_MAP: Record<string, string> = {
  Archetypes: "Archetype",
  Prowesses: "Prowess",
  "General Feats": "General Feat",
  Hidden: "Hidden Feat",
  "Dark Feats": "Dark Feat",
};

async function generateDescription(title: string, content: string, categories: string[]): Promise<string | null> {
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
            content: "You are a TTRPG content summarizer. Given a feat's title, categories, and wiki content, write a concise 1-2 sentence description suitable for display in a feat list. Focus on what the feat does mechanically.",
          },
          {
            role: "user",
            content: `Title: ${title}\nCategories: ${categories.join(", ")}\n\nContent:\n${content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_description",
              description: "Set the generated description for this feat.",
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

    let mode = "execute";
    try {
      const body = await req.json();
      if (body?.mode) mode = body.mode;
    } catch {
      // no body = default execute
    }

    // Fetch Feats, Official, and all type categories in parallel
    const categoryKeys = Object.keys(CATEGORY_MAP);
    const [featTitles, officialTitles, ...typeLists] = await Promise.all([
      fetchCategoryMembers("Feats"),
      fetchCategoryMembers("Official"),
      ...categoryKeys.map((cat) => fetchCategoryMembers(cat)),
    ]);

    const officialSet = new Set(officialTitles);
    const intersectedTitles = featTitles.filter((t) => officialSet.has(t));

    // Build category lookup: title -> string[]
    const categoryLookup = new Map<string, string[]>();
    typeLists.forEach((list, idx) => {
      const label = CATEGORY_MAP[categoryKeys[idx]];
      for (const title of list) {
        const existing = categoryLookup.get(title);
        if (existing) {
          existing.push(label);
        } else {
          categoryLookup.set(title, [label]);
        }
      }
    });

    if (intersectedTitles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, items: [], total: 0, message: "No feats found in both Feats and Official categories" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing feats (include description to check if it needs AI generation)
    const { data: existingFeats } = await adminClient
      .from("feats")
      .select("id, title, content, categories, description");
    const existingMap = new Map(
      (existingFeats || []).map((f: any) => [f.title, f])
    );

    // Fetch each page content
    const items: { title: string; status: "new" | "modified" | "unchanged"; categories: string[] }[] = [];
    const pageContents = new Map<string, string>();

    for (const title of intersectedTitles) {
      const categories = categoryLookup.get(title) || [];
      try {
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
          items.push({ title, status: "new", categories });
        } else if (existing.content !== content || JSON.stringify(existing.categories || []) !== JSON.stringify(categories)) {
          items.push({ title, status: "modified", categories });
        } else {
          items.push({ title, status: "unchanged", categories });
        }
      } catch {
        items.push({ title, status: "new", categories });
      }
    }

    if (mode === "preview") {
      return new Response(
        JSON.stringify({ success: true, items, total: items.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute: upsert new + modified, generate AI descriptions when empty
    let imported = 0;
    const errors: string[] = [];

    for (const item of items) {
      if (item.status === "unchanged") continue;
      try {
        const content = pageContents.get(item.title) || "";
        const existing = existingMap.get(item.title);

        // Check if we need to generate a description
        const existingDescription = existing?.description;
        const needsDescription = !existingDescription || existingDescription.trim() === "";
        let description: string | null = existingDescription || null;

        if (needsDescription) {
          description = await generateDescription(item.title, content, item.categories);
        }

        if (existing) {
          await adminClient
            .from("feats")
            .update({ content, description: description || "Imported from prima.wiki", categories: item.categories })
            .eq("id", existing.id);
        } else {
          await adminClient
            .from("feats")
            .insert({ title: item.title, content, description: description || "Imported from prima.wiki", categories: item.categories });
        }
        imported++;
      } catch (e: any) {
        errors.push(`Error processing ${item.title}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported, total: intersectedTitles.length, errors }),
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
