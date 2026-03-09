import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface EmbeddedFeatMeta {
  description: string | null;
  prerequisites: string | null;
  specialities: string[] | null;
  subfeats: any[] | null;
  unlocks_categories: string[] | null;
  blocking: string[] | null;
}

function parseEmbeddedFeatMeta(content: string): EmbeddedFeatMeta {
  const result: EmbeddedFeatMeta = {
    description: null, prerequisites: null, specialities: null, subfeats: null, unlocks_categories: null, blocking: null,
  };
  const tagRegex = /<!--@\s*([\w:]+)\s*:\s*(.*?)\s*@-->/g;
  let match: RegExpExecArray | null;
  const subfeatSlots: any[] = [];
  while ((match = tagRegex.exec(content)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key === "feat_one_liner") result.description = value;
    else if (key === "feat_prerequisites") result.prerequisites = value;
    else if (key === "feat_specialities") result.specialities = value.split(",").map(s => s.trim()).filter(Boolean);
    else if (key === "feat_unlocks") result.unlocks_categories = value.split(",").map(s => s.trim()).filter(Boolean);
    else if (key === "feat_blocking") result.blocking = value.split(",").map(s => s.trim()).filter(Boolean);
    else if (key.startsWith("feat_subfeat:")) {
      const slotNum = parseInt(key.split(":")[1], 10);
      if (isNaN(slotNum)) continue;
      const parts = value.split(",").map(s => s.trim());
      if (parts.length < 2) continue;
      const kind = parts[0] as "fixed" | "list" | "type";
      let optional = false; let valueStart = 1;
      if (parts[1] === "optional") { optional = true; valueStart = 2; }
      const rest = parts.slice(valueStart).join(",").trim();
      const slot: any = { slot: slotNum, kind, optional };
      if (kind === "fixed") slot.feat_title = rest;
      else if (kind === "list") slot.options = rest.split("|").map(s => s.trim()).filter(Boolean);
      else if (kind === "type") slot.filter = rest;
      subfeatSlots.push(slot);
    }
  }
  if (subfeatSlots.length > 0) result.subfeats = subfeatSlots.sort((a, b) => a.slot - b.slot);
  return result;
}

function generateParseableBlock(meta: EmbeddedFeatMeta): string {
  const lines: string[] = [];
  if (meta.description?.trim()) lines.push(`<!--@ feat_one_liner: ${meta.description.trim()} @-->`);
  if (meta.prerequisites?.trim()) lines.push(`<!--@ feat_prerequisites: ${meta.prerequisites.trim()} @-->`);

  if (meta.specialities && meta.specialities.length > 0) lines.push(`<!--@ feat_specialities: ${meta.specialities.join(", ")} @-->`);
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
  if (meta.unlocks_categories && meta.unlocks_categories.length > 0) lines.push(`<!--@ feat_unlocks: ${meta.unlocks_categories.join(", ")} @-->`);
  if (meta.blocking && meta.blocking.length > 0) lines.push(`<!--@ feat_blocking: ${meta.blocking.join(", ")} @-->`);
  if (lines.length === 0) return "";
  return `<!--@ PARSEABLE FIELDS START @-->\n${lines.join("\n")}\n<!--@ PARSEABLE FIELDS END @-->`;
}

function stripParseableBlock(content: string): string {
  return content.replace(/\n*<!--@ PARSEABLE FIELDS START @-->[\s\S]*?<!--@ PARSEABLE FIELDS END @-->\n*/g, "").trimEnd();
}

function mergeParseableBlock(existingContent: string, newBlock: string): string {
  const stripped = stripParseableBlock(existingContent);
  if (!newBlock) return stripped;
  return stripped + "\n\n" + newBlock;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateDescription(title: string, content: string, categories?: string[]): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const categoryInfo = categories?.length ? ` Categories: ${categories.join(", ")}.` : "";
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `You are a TRPG content summarizer. Given a feat's title, categories, and wiki content, write a single short sentence (under 15 words).

IMPORTANT RULE for tone:
- If the feat is an ARCHETYPE (has "Archetype" in its categories): describe the CHARACTER PERSONALITY and FLAVOR — who this person is, their temperament, their place in medieval society. Do NOT mention game mechanics.
- If the feat is NOT an archetype: describe the feat's PRACTICAL EFFECT — what it lets the character do, their capability. Be vivid but focus on the tangible ability.

Do not copy these examples, generate original text in the same spirit:
- Archetype example tone: "A cunning dealmaker who thrives in the shadowy markets of medieval cities."
- Non-archetype example tone: "Move with uncanny grace, scaling walls and dodging blows effortlessly."` },
        { role: "user", content: `Title: ${title}\nCategories:${categoryInfo}\n\nContent:\n${(content || "").slice(0, 3000)}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "set_description",
          description: "Set the generated description for this feat.",
          parameters: { type: "object", properties: { description: { type: "string" } }, required: ["description"], additionalProperties: false },
        },
      }],
      tool_choice: { type: "function", function: { name: "set_description" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limited");
    if (response.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`AI gateway error: ${response.status}`);
  }
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    return args.description || "No description generated.";
  }
  return "No description generated.";
}

async function generateSubfeats(title: string, content: string, categories: string[], allFeatTitles: string[]): Promise<{ subfeats: any[] | null; unlocks_categories: string[] | null }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const systemPrompt = `You are a TRPG feat analyzer. You determine whether a feat grants "subfeats" — additional feat choices a character gets when they acquire the parent feat.

There are 3 kinds of subfeat slots (up to 4 slots per feat):
1. "fixed" — A specific feat is always granted. Use "feat_title" to name it.
2. "list" — The player picks from a named list of feats. Use "options" array with feat titles. Set "optional" to true if the player can choose not to pick.
3. "type" — The player picks any feat matching a category filter. Use "filter" string with comma-separated rules. Prefix "not:" to exclude a category (e.g. "not:Archetype,not:Hidden Feat"). Use a bare category name to REQUIRE it (e.g. "Dark Feat" means only feats in that category). You can combine both: "Dark Feat,not:Hidden Feat". Set "optional" to false if they must pick one.

CATEGORY UNLOCKING: Some feats unlock entire categories for the character. For example, "Dark Faith" allows the character to pick "Dark Feat" feats during normal level-up. If a feat grants access to a category, return it in "unlocks_categories". Most feats unlock nothing — return an empty array.

Most feats do NOT grant subfeats. Only return subfeats if the wiki content clearly indicates the feat grants additional feats.

Available feat titles for reference:
${allFeatTitles.join(", ")}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Title: ${title}\nCategories: ${categories.join(", ")}\n\nWiki Content:\n${content}` },
      ],
      tools: [{
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
              unlocks_categories: {
                type: "array",
                items: { type: "string" },
                description: "Category names this feat unlocks. Most feats unlock nothing — return an empty array.",
              },
            },
            required: ["subfeats", "unlocks_categories"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "set_subfeats" } },
    }),
  });

  if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    return {
      subfeats: Array.isArray(args.subfeats) && args.subfeats.length > 0 ? args.subfeats : null,
      unlocks_categories: Array.isArray(args.unlocks_categories) && args.unlocks_categories.length > 0 ? args.unlocks_categories : null,
    };
  }
  return { subfeats: null, unlocks_categories: null };
}

async function generateSpecialities(title: string, content: string, categories: string[]): Promise<string[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `You are a TRPG feat analyzer. Some feats require the player to choose a speciality when they pick the feat. Analyze the feat's wiki content and determine if this feat requires the player to choose a speciality and if yes, what are all the valid speciality options. Most feats do NOT have specialities. Only return specialities if the wiki content clearly lists specific options. Return an empty array if no specialities exist.` },
        { role: "user", content: `Title: ${title}\nCategories: ${categories.join(", ")}\n\nWiki Content:\n${content}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "set_specialities",
          description: "Set the speciality options for this feat. Pass an empty array if the feat has no specialities.",
          parameters: {
            type: "object",
            properties: { specialities: { type: "array", items: { type: "string" } } },
            required: ["specialities"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "set_specialities" } },
    }),
  });

  if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    if (Array.isArray(args.specialities) && args.specialities.length > 0) return args.specialities;
  }
  return null;
}

async function generatePrerequisites(title: string, content: string, categories: string[]): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `You are a TRPG feat analyzer. Analyze the feat's wiki content and extract its prerequisites. Prerequisites are conditions a character must meet to take this feat (e.g. other feats, levels, attributes). Return the prerequisites as a free-form text string using wiki link syntax for feat references (e.g. "[[Prowess]], Level 3"). If the feat has no prerequisites, return an empty string.` },
        { role: "user", content: `Title: ${title}\nCategories: ${categories.join(", ")}\n\nWiki Content:\n${content}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "set_prerequisites",
          description: "Set the prerequisites for this feat. Pass an empty string if the feat has no prerequisites.",
          parameters: {
            type: "object",
            properties: { prerequisites: { type: "string" } },
            required: ["prerequisites"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "set_prerequisites" } },
    }),
  });

  if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    if (args.prerequisites?.trim()) return args.prerequisites.trim();
  }
  return null;
}

async function generateBlocking(title: string, content: string, categories: string[], allFeatTitles: string[]): Promise<string[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `You are a TRPG feat analyzer. Analyze the feat's wiki content and determine which other feats are INCOMPATIBLE with this feat. Blocking feats are feats that cannot be taken together — if a character has one, they cannot take the other. This is typically stated explicitly in the wiki content (e.g. "incompatible with X", "cannot be combined with Y", "mutually exclusive with Z"). Most feats do NOT block any other feats. Only return blocking feats if the wiki content clearly states incompatibility. Return feat titles that exist in the system.\n\nAvailable feat titles:\n${allFeatTitles.join(", ")}` },
        { role: "user", content: `Title: ${title}\nCategories: ${categories.join(", ")}\n\nWiki Content:\n${content}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "set_blocking",
          description: "Set the blocking (incompatible) feats for this feat. Pass an empty array if the feat has no incompatibilities.",
          parameters: {
            type: "object",
            properties: { blocking: { type: "array", items: { type: "string" } } },
            required: ["blocking"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "set_blocking" } },
    }),
  });

  if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    if (Array.isArray(args.blocking) && args.blocking.length > 0) return args.blocking;
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"])
      .limit(1);

    if (!roleData?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, id, action } = await req.json();

    // ===== REGENERATE ALL AI FOR A SINGLE FEAT =====
    // Wipes existing parseable block, regenerates all 3 fields fresh
    if (action === "regenerate_all" || (type === "feat" && !action)) {
      if (!id) {
        return new Response(JSON.stringify({ error: "Need id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: feat, error: fetchError } = await adminClient
        .from("feats")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !feat) {
        return new Response(JSON.stringify({ error: "Feat not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Strip existing parseable block — we regenerate everything fresh
      // Use raw_content for parsing/regeneration since it preserves HTML comments
      const sourceContent = feat.raw_content || feat.content || "";
      const cleanContent = stripParseableBlock(sourceContent);

      // Generate all fields in parallel
      const { data: allFeats } = await adminClient.from("feats").select("title");
      const allFeatTitles = (allFeats || []).map((f: any) => f.title);

      const [description, subfeatResult, specialities, prerequisites, blocking] = await Promise.all([
        generateDescription(feat.title, cleanContent, feat.categories || []),
        generateSubfeats(feat.title, cleanContent, feat.categories || [], allFeatTitles),
        generateSpecialities(feat.title, cleanContent, feat.categories || []),
        generatePrerequisites(feat.title, cleanContent, feat.categories || []),
        generateBlocking(feat.title, cleanContent, feat.categories || [], allFeatTitles),
      ]);

      const newMeta: EmbeddedFeatMeta = {
        description,
        prerequisites,
        subfeats: subfeatResult.subfeats,
        specialities,
        unlocks_categories: subfeatResult.unlocks_categories,
        blocking,
      };

      const block = generateParseableBlock(newMeta);
      // Merge parseable block into raw_content only; content stays as expanded (display) content
      const updatedRawContent = mergeParseableBlock(sourceContent, block);

      const { error: updateError } = await adminClient
        .from("feats")
        .update({ raw_content: updatedRawContent })
        .eq("id", id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, meta: newMeta }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SCENARIO DESCRIPTION =====
    if (type === "scenario") {
      if (!id) {
        return new Response(JSON.stringify({ error: "Need id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: item, error: fetchError } = await adminClient
        .from("scenarios")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !item) {
        return new Response(JSON.stringify({ error: "Item not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You write short, useful descriptions for tabletop RPG content." },
            { role: "user", content: `Write a concise 1-2 sentence description for this tabletop RPG scenario titled "${item.title}".\n\nContent:\n${(item.content || "").slice(0, 3000)}\n\nReturn ONLY the description, no quotes or extra formatting.` },
          ],
        }),
      });

      if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
      const data = await response.json();
      const description = data.choices?.[0]?.message?.content?.trim() || "No description generated.";

      const { error: updateError } = await adminClient
        .from("scenarios")
        .update({ description })
        .eq("id", id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ description }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regenerate-description error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
