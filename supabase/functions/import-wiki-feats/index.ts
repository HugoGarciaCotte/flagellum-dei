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
            content: "You are a TRPG content summarizer. Given a feat's title, categories, and wiki content, write a single short sentence (under 15 words) describing the feat's mechanical effect, suitable for a compact list view.",
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

async function generateSubfeats(
  title: string,
  content: string,
  categories: string[],
  allFeatTitles: string[]
): Promise<{ subfeats: any[] | null; unlocks_categories: string[] | null }> {
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return { subfeats: null, unlocks_categories: null };

    const systemPrompt = `You are a TRPG feat analyzer. You determine whether a feat grants "subfeats" — additional feat choices a character gets when they acquire the parent feat.

There are 3 kinds of subfeat slots (up to 4 slots per feat):
1. "fixed" — A specific feat is always granted. Use "feat_title" to name it.
2. "list" — The player picks from a named list of feats. Use "options" array with feat titles. Set "optional" to true if the player can choose not to pick.
3. "type" — The player picks any feat matching a category filter. Use "filter" string like "not:Archetype,not:Hidden Feat" to exclude categories. Set "optional" to false if they must pick one.

ARCHETYPE PATTERN: Archetypes almost always follow this pattern:
- Slot 1: "list" with options ["Faith"] and optional:true (the character can choose Faith or not)
- Slot 2: "fixed" with one default feat (e.g. Knowledge for Alchemist)
- Slot 3: "list" with specific feats the archetype can learn from, optional:true

NON-ARCHETYPE PATTERN: Some general feats like "Foreigner" grant a subfeat of type "type" where the player picks any non-Archetype, non-Hidden feat.

Most feats do NOT grant subfeats. Only return subfeats if the wiki content clearly indicates the feat grants additional feats.

CATEGORY UNLOCKING: Some feats unlock entire categories for the character. For example, "Dark Faith" allows the character to pick "Dark Feat" feats during normal level-up. If a feat grants access to a category, return it in "unlocks_categories". Most feats unlock nothing — return an empty array.

Available feat titles for reference:
${allFeatTitles.join(", ")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Title: ${title}\nCategories: ${categories.join(", ")}\n\nWiki Content:\n${content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_subfeats",
              description: "Set the subfeat definitions for this feat. Pass an empty array if the feat does not grant any subfeats.",
              parameters: {
                type: "object",
                properties: {
                  subfeats: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        slot: { type: "integer", description: "Slot number 1-4" },
                        kind: { type: "string", enum: ["fixed", "list", "type"] },
                        feat_title: { type: "string", description: "For 'fixed' kind: the feat title that is always granted" },
                        options: { type: "array", items: { type: "string" }, description: "For 'list' kind: array of feat titles to choose from" },
                        filter: { type: "string", description: "For 'type' kind: comma-separated filter like 'not:Archetype,not:Hidden Feat'" },
                        optional: { type: "boolean", description: "Whether the player can choose not to pick a subfeat for this slot" },
                      },
                      required: ["slot", "kind"],
                      additionalProperties: false,
                    },
                  },
                  unlocks_categories: {
                    type: "array",
                    items: { type: "string" },
                    description: "Category names this feat unlocks for the character during level-up. E.g. 'Dark Faith' unlocks 'Dark Feat'. Most feats unlock nothing — return an empty array.",
                  },
                },
                required: ["subfeats", "unlocks_categories"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_subfeats" } },
      }),
    });

    if (!response.ok) return { subfeats: null, unlocks_categories: null };

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      const subfeats = Array.isArray(args.subfeats) && args.subfeats.length > 0 ? args.subfeats : null;
      const unlocks = Array.isArray(args.unlocks_categories) && args.unlocks_categories.length > 0 ? args.unlocks_categories : null;
      return { subfeats, unlocks_categories: unlocks };
    }
    return { subfeats: null, unlocks_categories: null };
  } catch {
    return { subfeats: null, unlocks_categories: null };
  }
}

async function generateSpecialities(
  title: string,
  content: string,
  categories: string[]
): Promise<string[] | null> {
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
            content: `You are a TRPG feat analyzer. Some feats require the player to choose a speciality when they pick the feat. For example, the "Combat" feat requires choosing a combat speciality (like Swords, Axes, Bows, etc.).

Analyze the feat's wiki content and determine:
1. Whether this feat requires the player to choose a speciality
2. If yes, what are all the valid speciality options

Most feats do NOT have specialities. Only return specialities if the wiki content clearly lists specific options the player must choose from when acquiring this feat. Return an empty array if no specialities exist.`,
          },
          {
            role: "user",
            content: `Title: ${title}\nCategories: ${categories.join(", ")}\n\nWiki Content:\n${content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_specialities",
              description: "Set the speciality options for this feat. Pass an empty array if the feat has no specialities.",
              parameters: {
                type: "object",
                properties: {
                  specialities: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of speciality options the player can choose from. Empty array if none.",
                  },
                },
                required: ["specialities"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_specialities" } },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      if (Array.isArray(args.specialities) && args.specialities.length > 0) {
        return args.specialities;
      }
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

    // Fetch existing feats (include description, subfeats, specialities to check if they need AI generation)
    const { data: existingFeats } = await adminClient
      .from("feats")
      .select("id, title, content, categories, description, subfeats, unlocks_categories, specialities");
    const existingMap = new Map(
      (existingFeats || []).map((f: any) => [f.title, f])
    );

    // Fetch each page content
    const items: { title: string; status: "new" | "modified" | "unchanged"; categories: string[] }[] = [];
    const pageContents = new Map<string, string>();

    for (const title of intersectedTitles) {
      const categories = categoryLookup.get(title) || [];
      try {
        const pageUrl = `https://prima.wiki/api.php?action=expandtemplates&title=${encodeURIComponent(title)}&text={{:${encodeURIComponent(title)}}}&prop=wikitext&format=json`;
        const pageRes = await fetch(pageUrl);
        const pageData = await pageRes.json();

        const content = pageData?.expandtemplates?.wikitext || "";
        if (!content) continue;
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

    // Build all-feat-titles list for subfeat AI context
    const allFeatTitles = intersectedTitles;

    // Execute: upsert new + modified, generate AI descriptions + subfeats + specialities in parallel batches
    let imported = 0;
    const errors: string[] = [];
    const toProcess = items.filter((i) => i.status !== "unchanged");

    const BATCH_SIZE = 5;
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const content = pageContents.get(item.title) || "";
          const existing = existingMap.get(item.title);

          const existingDescription = existing?.description;
          const needsDescription = !existingDescription || existingDescription.trim() === "" || existingDescription === "Imported from prima.wiki";
          let description: string | null = existingDescription || null;

          if (needsDescription) {
            description = await generateDescription(item.title, content, item.categories);
          }

          // Generate subfeats and unlocks_categories if not already set
          const existingSubfeats = existing?.subfeats;
          let subfeats: any[] | null = existingSubfeats || null;
          let unlocks_categories: string[] | null = existing?.unlocks_categories || null;
          if (!existingSubfeats) {
            const result = await generateSubfeats(item.title, content, item.categories, allFeatTitles);
            subfeats = result.subfeats;
            unlocks_categories = result.unlocks_categories;
          }

          // Generate specialities if not already set
          const existingSpecialities = existing?.specialities;
          let specialities: string[] | null = existingSpecialities || null;
          if (!existingSpecialities) {
            specialities = await generateSpecialities(item.title, content, item.categories);
          }

          const payload: any = {
            content,
            description: description || "Imported from prima.wiki",
            categories: item.categories,
            subfeats: subfeats || null,
            unlocks_categories: unlocks_categories || null,
            specialities: specialities || null,
          };

          if (existing) {
            await adminClient
              .from("feats")
              .update(payload)
              .eq("id", existing.id);
          } else {
            await adminClient
              .from("feats")
              .insert({ title: item.title, ...payload });
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
