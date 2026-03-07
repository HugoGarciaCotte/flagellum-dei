import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateDescription(
  title: string,
  content: string,
  categories?: string[],
  type?: string
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const categoryInfo = categories?.length ? ` Categories: ${categories.join(", ")}.` : "";
  const typeLabel = type === "feat" ? "feat" : "scenario";

  const prompt = `Write a concise 1-2 sentence description for this tabletop RPG ${typeLabel} titled "${title}".${categoryInfo}

Content:
${(content || "").slice(0, 3000)}

Return ONLY the description, no quotes or extra formatting.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You write short, useful descriptions for tabletop RPG content." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "No description generated.";
}

async function generateSubfeats(
  title: string,
  content: string,
  categories: string[],
  allFeatTitles: string[]
): Promise<any[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const systemPrompt = `You are a TRPG feat analyzer. You determine whether a feat grants "subfeats" — additional feat choices a character gets when they acquire the parent feat.

There are 3 kinds of subfeat slots (up to 3 slots per feat):
1. "fixed" — A specific feat is always granted. Use "feat_title" to name it.
2. "list" — The player picks from a named list of feats. Use "options" array with feat titles. Set "optional" to true if the player can choose not to pick.
3. "type" — The player picks any feat matching a category filter. Use "filter" string like "not:Archetype,not:Hidden Feat" to exclude categories. Set "optional" to false if they must pick one.

ARCHETYPE PATTERN: Archetypes almost always follow this pattern:
- Slot 1: "list" with options ["Faith"] and optional:true (the character can choose Faith or not)
- Slot 2: "fixed" with one default feat (e.g. Knowledge for Alchemist)
- Slot 3: "list" with specific feats the archetype can learn from, optional:true

NON-ARCHETYPE PATTERN: Some general feats like "Foreigner" grant a subfeat of type "type" where the player picks any non-Archetype, non-Hidden feat.

Most feats do NOT grant subfeats. Only return subfeats if the wiki content clearly indicates the feat grants additional feats.

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
                      slot: { type: "integer" },
                      kind: { type: "string", enum: ["fixed", "list", "type"] },
                      feat_title: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      filter: { type: "string" },
                      optional: { type: "boolean" },
                    },
                    required: ["slot", "kind"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["subfeats"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "set_subfeats" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    const subfeats = args.subfeats;
    if (Array.isArray(subfeats) && subfeats.length > 0) {
      return subfeats;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"])
      .limit(1);

    if (!roleData?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, id, action } = await req.json();

    // Handle subfeat regeneration
    if (action === "regenerate_subfeats") {
      if (!id) {
        return new Response(JSON.stringify({ error: "Need id for subfeat regeneration" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: feat, error: fetchError } = await adminClient
        .from("feats")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !feat) {
        return new Response(JSON.stringify({ error: "Feat not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch all feat titles for context
      const { data: allFeats } = await adminClient.from("feats").select("title");
      const allFeatTitles = (allFeats || []).map((f: any) => f.title);

      const subfeats = await generateSubfeats(
        feat.title,
        feat.content || "",
        feat.categories || [],
        allFeatTitles
      );

      const { error: updateError } = await adminClient
        .from("feats")
        .update({ subfeats: subfeats || null })
        .eq("id", id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ subfeats: subfeats || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Original description regeneration
    if (!type || !id || !["feat", "scenario"].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid request. Need type (feat|scenario) and id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const table = type === "feat" ? "feats" : "scenarios";
    const { data: item, error: fetchError } = await adminClient
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const description = await generateDescription(
      item.title,
      item.content || "",
      type === "feat" ? item.categories : undefined,
      type
    );

    const { error: updateError } = await adminClient
      .from(table)
      .update({ description })
      .eq("id", id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regenerate-description error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
