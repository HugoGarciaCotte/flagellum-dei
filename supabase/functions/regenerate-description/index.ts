import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface EmbeddedFeatMeta {
  description: string | null;
  specialities: string[] | null;
  subfeats: any[] | null;
  unlocks_categories: string[] | null;
}

function parseEmbeddedFeatMeta(content: string): EmbeddedFeatMeta {
  const result: EmbeddedFeatMeta = {
    description: null,
    specialities: null,
    subfeats: null,
    unlocks_categories: null,
  };

  const tagRegex = /<!--@\s*([\w:]+)\s*:\s*(.*?)\s*@-->/g;
  let match: RegExpExecArray | null;
  const subfeatSlots: any[] = [];

  while ((match = tagRegex.exec(content)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();

    if (key === "feat_one_liner") {
      result.description = value;
    } else if (key === "feat_specialities") {
      result.specialities = value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (key === "feat_unlocks") {
      result.unlocks_categories = value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (key.startsWith("feat_subfeat:")) {
      const slotNum = parseInt(key.split(":")[1], 10);
      if (isNaN(slotNum)) continue;

      const parts = value.split(",").map((s) => s.trim());
      if (parts.length < 2) continue;

      const kind = parts[0] as "fixed" | "list" | "type";
      let optional = false;
      let valueStart = 1;

      if (parts[1] === "optional") {
        optional = true;
        valueStart = 2;
      }

      const rest = parts.slice(valueStart).join(",").trim();
      const slot: any = { slot: slotNum, kind, optional };

      if (kind === "fixed") {
        slot.feat_title = rest;
      } else if (kind === "list") {
        slot.options = rest.split("|").map((s) => s.trim()).filter(Boolean);
      } else if (kind === "type") {
        slot.filter = rest;
      }

      subfeatSlots.push(slot);
    }
  }

  if (subfeatSlots.length > 0) {
    result.subfeats = subfeatSlots.sort((a, b) => a.slot - b.slot);
  }

  return result;
}

function generateParseableBlock(meta: EmbeddedFeatMeta): string {
  const lines: string[] = [];
  if (meta.description?.trim()) {
    lines.push(`<!--@ feat_one_liner: ${meta.description.trim()} @-->`);
  }
  if (meta.specialities && meta.specialities.length > 0) {
    lines.push(`<!--@ feat_specialities: ${meta.specialities.join(", ")} @-->`);
  }
  if (meta.subfeats && meta.subfeats.length > 0) {
    for (const s of meta.subfeats) {
      const parts: string[] = [s.kind];
      if (s.optional) parts.push("optional");
      if (s.kind === "fixed" && s.feat_title) parts.push(s.feat_title);
      else if (s.kind === "list" && s.options) parts.push(s.options.join("|"));
      else if (s.kind === "type" && s.filter) parts.push(s.filter);
      lines.push(`<!--@ feat_subfeat:${s.slot}: ${parts.join(", ")} @-->`);
    }
  }
  if (meta.unlocks_categories && meta.unlocks_categories.length > 0) {
    lines.push(`<!--@ feat_unlocks: ${meta.unlocks_categories.join(", ")} @-->`);
  }
  if (lines.length === 0) return "";
  return `<!--@ PARSEABLE FIELDS START @-->\n${lines.join("\n")}\n<!--@ PARSEABLE FIELDS END @-->`;
}

function mergeParseableBlock(existingContent: string, newBlock: string): string {
  const startMarker = "<!--@ PARSEABLE FIELDS START @-->";
  const endMarker = "<!--@ PARSEABLE FIELDS END @-->";
  const startIdx = existingContent.indexOf(startMarker);
  const endIdx = existingContent.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    const before = existingContent.substring(0, startIdx).trimEnd();
    const after = existingContent.substring(endIdx + endMarker.length).trimStart();
    if (!newBlock) return (before + (after ? "\n" + after : "")).trimEnd();
    return (before + "\n" + newBlock + (after ? "\n" + after : "")).trimEnd();
  }

  if (!newBlock) return existingContent;
  return existingContent.trimEnd() + "\n\n" + newBlock;
}

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

There are 3 kinds of subfeat slots (up to 4 slots per feat):
1. "fixed" — A specific feat is always granted. Use "feat_title" to name it.
2. "list" — The player picks from a named list of feats. Use "options" array with feat titles. Set "optional" to true if the player can choose not to pick.
3. "type" — The player picks any feat matching a category filter. Use "filter" string with comma-separated rules. Prefix "not:" to exclude a category (e.g. "not:Archetype,not:Hidden Feat"). Use a bare category name to REQUIRE it (e.g. "Dark Feat" means only feats in that category). You can combine both: "Dark Feat,not:Hidden Feat". Set "optional" to false if they must pick one.

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

async function generateSpecialities(
  title: string,
  content: string,
  categories: string[]
): Promise<string[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

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
          content: `You are a TRPG feat analyzer. Some feats require the player to choose a speciality when they pick the feat.

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

  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    if (Array.isArray(args.specialities) && args.specialities.length > 0) {
      return args.specialities;
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

    // Handle speciality regeneration
    if (action === "regenerate_specialities") {
      if (!id) {
        return new Response(JSON.stringify({ error: "Need id for speciality regeneration" }), {
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

      const meta = parseEmbeddedFeatMeta(feat.content || "");
      let specialities: string[] | null;

      if (meta.specialities) {
        specialities = meta.specialities;
      } else {
        specialities = await generateSpecialities(
          feat.title,
          feat.content || "",
          feat.categories || []
        );
      }

      // Merge back into content
      const updatedMeta = { ...meta, specialities: specialities || null };
      const block = generateParseableBlock(updatedMeta);
      const updatedContent = mergeParseableBlock(feat.content || "", block);

      const { error: updateError } = await adminClient
        .from("feats")
        .update({ content: updatedContent })
        .eq("id", id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ specialities: specialities || null, fromWiki: !!meta.specialities }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

      const meta = parseEmbeddedFeatMeta(feat.content || "");
      let subfeats: any[] | null;
      let unlocks_categories = meta.unlocks_categories;

      if (meta.subfeats) {
        subfeats = meta.subfeats;
      } else {
        const { data: allFeats } = await adminClient.from("feats").select("title");
        const allFeatTitles = (allFeats || []).map((f: any) => f.title);

        subfeats = await generateSubfeats(
          feat.title,
          feat.content || "",
          feat.categories || [],
          allFeatTitles
        );
      }

      // Merge back into content
      const updatedMeta = { ...meta, subfeats: subfeats || null, unlocks_categories };
      const block = generateParseableBlock(updatedMeta);
      const updatedContent = mergeParseableBlock(feat.content || "", block);

      const { error: updateError } = await adminClient
        .from("feats")
        .update({ content: updatedContent })
        .eq("id", id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ subfeats: subfeats || null, fromWiki: !!meta.subfeats }), {
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

    if (type === "scenario") {
      // Scenarios still have their own description column
      const { data: item, error: fetchError } = await adminClient
        .from("scenarios")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !item) {
        return new Response(JSON.stringify({ error: "Item not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const description = await generateDescription(item.title, item.content || "", undefined, "scenario");

      const { error: updateError } = await adminClient
        .from("scenarios")
        .update({ description })
        .eq("id", id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ description }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // type === "feat" — regenerate description and merge into content
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

    const meta = parseEmbeddedFeatMeta(feat.content || "");
    let description: string;

    if (meta.description) {
      description = meta.description;
    } else {
      description = await generateDescription(
        feat.title,
        feat.content || "",
        feat.categories,
        "feat"
      );
    }

    // Merge back into content
    const updatedMeta = { ...meta, description };
    const block = generateParseableBlock(updatedMeta);
    const updatedContent = mergeParseableBlock(feat.content || "", block);

    const { error: updateError } = await adminClient
      .from("feats")
      .update({ content: updatedContent })
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
