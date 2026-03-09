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

function stripParseableBlock(content: string): string {
  return content.replace(/\n*<!--@ PARSEABLE FIELDS START @-->[\s\S]*?<!--@ PARSEABLE FIELDS END @-->\n*/g, "").trimEnd();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Suggestion {
  field: string;
  current: string | null;
  suggested: string | null;
  action: "add" | "modify" | "delete";
}

async function checkFeatWithAI(
  feat: any,
  allFeatTitles: string[]
): Promise<Suggestion[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const sourceContent = feat.raw_content || feat.content || "";
  const cleanContent = stripParseableBlock(sourceContent);
  const currentMeta = parseEmbeddedFeatMeta(sourceContent);

  const currentFieldsStr = JSON.stringify({
    description: currentMeta.description,
    prerequisites: currentMeta.prerequisites,
    specialities: currentMeta.specialities,
    subfeats: currentMeta.subfeats,
    unlocks_categories: currentMeta.unlocks_categories,
    blocking: currentMeta.blocking,
  }, null, 2);

  const systemPrompt = `You are a TRPG feat metadata reviewer. Given a feat's wiki content and its current parseable metadata fields, determine if each field is accurate, missing, or should be removed.

Fields to review:
- description: A short (under 15 words) sentence. For Archetypes (check categories): character personality/flavor (who they are). For other feats: practical effect (what they can do). Never use mechanical jargon.
- prerequisites: Free-form text listing what is required to take this feat (e.g. "Level 3, [[Prowess]]"). Most feats have none.
- specialities: Options where the feat is used as "{Title} ({option})". ONLY valid if parenthesized variants exist in the wiki content AND "{Title} ({option})" is NOT a standalone feat in the database. Most feats have none.
- subfeats: Subfeat slot definitions (fixed/list/type) — most feats have none
- unlocks_categories: Categories this feat unlocks for the character (most feats unlock nothing)
- blocking: List of feat titles that are incompatible with this feat (most feats block nothing)

For each field, compare the current value against what the wiki content suggests. Return suggestions for fields that need to be added, modified, or deleted.

Available feat titles for reference:
${allFeatTitles.join(", ")}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Title: ${feat.title}\nCategories: ${(feat.categories || []).join(", ")}\n\nWiki Content (without parseable tags):\n${cleanContent}\n\nCurrent parseable fields:\n${currentFieldsStr}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "review_fields",
          description: "Return suggestions for parseable field changes. Only include fields that need changes.",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string", enum: ["description", "prerequisites", "specialities", "subfeats", "unlocks_categories", "blocking"] },
                    action: { type: "string", enum: ["add", "modify", "delete"] },
                    reason: { type: "string", description: "Brief explanation of why this change is needed" },
                    suggested_value: { type: "string", description: "The suggested new value (as a string representation). For arrays use comma-separated. For subfeats describe the slots." },
                  },
                  required: ["field", "action", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "review_fields" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limited");
    if (response.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return [];

  const args = JSON.parse(toolCall.function.arguments);
  if (!Array.isArray(args.suggestions)) return [];

  return args.suggestions.map((s: any) => {
    const currentValue = currentMeta[s.field as keyof EmbeddedFeatMeta];
    return {
      field: s.field,
      current: currentValue != null ? (Array.isArray(currentValue) ? JSON.stringify(currentValue) : String(currentValue)) : null,
      suggested: s.suggested_value || null,
      action: s.action,
      reason: s.reason,
    };
  });
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

    const { id, ids, all } = await req.json();

    let feats: any[];
    if (all) {
      const { data, error } = await adminClient.from("feats").select("*").order("title");
      if (error) throw error;
      feats = data || [];
    } else {
      const featIds: string[] = ids || (id ? [id] : []);
      if (featIds.length === 0) {
        return new Response(JSON.stringify({ error: "No feat id(s) provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await adminClient.from("feats").select("*").in("id", featIds);
      if (error) throw error;
      feats = data || [];
    }

    // Get all feat titles for context
    const { data: allFeatsData } = await adminClient.from("feats").select("title");
    const allFeatTitles = (allFeatsData || []).map((f: any) => f.title);

    const results: { title: string; id: string; suggestions: Suggestion[] }[] = [];

    // Process sequentially to avoid rate limits
    for (const feat of feats) {
      try {
        const suggestions = await checkFeatWithAI(feat, allFeatTitles);
        if (suggestions.length > 0) {
          results.push({ title: feat.title, id: feat.id, suggestions });
        }
      } catch (e: any) {
        results.push({ title: feat.title, id: feat.id, suggestions: [{ field: "error", current: null, suggested: e.message, action: "modify" }] });
      }
    }

    return new Response(JSON.stringify({ results, total: feats.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-feats-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
