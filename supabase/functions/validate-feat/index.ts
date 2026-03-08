import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { characterId, featId, pickType, level, parentFeatTitle } = await req.json();
    if (!characterId || !featId) {
      return new Response(JSON.stringify({ error: "characterId and featId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch target feat
    const { data: targetFeat, error: featError } = await supabase
      .from("feats")
      .select("id, title, categories, content")
      .eq("id", featId)
      .single();

    if (featError || !targetFeat) {
      return new Response(JSON.stringify({ error: "Feat not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch character
    const { data: character, error: charError } = await supabase
      .from("characters")
      .select("id, name, description")
      .eq("id", characterId)
      .single();

    if (charError || !character) {
      return new Response(JSON.stringify({ error: "Character not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current character feats with full feat details
    const { data: characterFeats } = await supabase
      .from("character_feats")
      .select("id, level, is_free, feat_id")
      .eq("character_id", characterId);

    const featIds = (characterFeats ?? []).map((cf: any) => cf.feat_id);
    let currentFeatsDetails: any[] = [];
    if (featIds.length > 0) {
      const { data } = await supabase
        .from("feats")
        .select("id, title, categories, content")
        .in("id", featIds);
      currentFeatsDetails = data ?? [];
    }

    // Fetch subfeats for all character feats
    const cfIds = (characterFeats ?? []).map((cf: any) => cf.id);
    let allSubfeats: any[] = [];
    if (cfIds.length > 0) {
      const { data } = await supabase
        .from("character_feat_subfeats")
        .select("character_feat_id, slot, subfeat_id")
        .in("character_feat_id", cfIds);
      allSubfeats = data ?? [];
    }

    // Fetch subfeat feat details
    const subfeatFeatIds = allSubfeats.map((s: any) => s.subfeat_id);
    let subfeatDetails: any[] = [];
    if (subfeatFeatIds.length > 0) {
      const { data } = await supabase
        .from("feats")
        .select("id, title, categories, content")
        .in("id", subfeatFeatIds);
      subfeatDetails = data ?? [];
    }
    const subfeatFeatMap = new Map(subfeatDetails.map((f: any) => [f.id, f]));

    // Build context for AI
    const featMap = new Map(currentFeatsDetails.map((f: any) => [f.id, f]));
    const currentFeatsFormatted = (characterFeats ?? [])
      .map((cf: any) => {
        const feat = featMap.get(cf.feat_id);
        if (!feat) return null;
        let line = `- ${feat.title} (Level ${cf.level}${cf.is_free ? ", Free" : ""}, Categories: ${feat.categories?.join(", ") || "none"})\n  Content: ${feat.content || "N/A"}`;

        // Append subfeats
        const cfSubs = allSubfeats.filter((s: any) => s.character_feat_id === cf.id);
        if (cfSubs.length > 0) {
          const subLines = cfSubs.map((s: any) => {
            const sf = subfeatFeatMap.get(s.subfeat_id);
            return sf ? `    ↳ Subfeat slot ${s.slot}: ${sf.title} (Categories: ${sf.categories?.join(", ") || "none"})` : null;
          }).filter(Boolean);
          if (subLines.length > 0) line += "\n" + subLines.join("\n");
        }
        return line;
      })
      .filter(Boolean)
      .join("\n");

    const targetFeatFormatted = `Title: ${targetFeat.title}\nCategories: ${targetFeat.categories?.join(", ") || "none"}\nFull Content:\n${targetFeat.content || "N/A"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a TRPG rules validator for the Prima system. Your job is to determine if a character meets all prerequisites to acquire a new feat.

Key rules:

1. ARCHETYPES & RESTRICTIONS: Some Archetypes explicitly forbid certain feats or categories. If the character has an Archetype whose content states that certain feats are illegal or restricted, deny those feats. Read each Archetype's content carefully for such restrictions.

2. PROWESS PREREQUISITES: Prowess feats often list prerequisites (e.g. "Prerequisite: ...", "Requires: ...", or similar phrasing). The character must already have the required feats. Be strict: if a prerequisite feat is missing, deny.

3. SUBFEAT RULES: By default, normal feats do NOT allow subfeats. A feat only allows subfeats if its content explicitly mentions granting additional feats, slots, or sub-choices. If the player is picking a subfeat for a parent feat that does not mention allowing subfeats, deny it. Archetype feats always allow subfeats.

4. INCOMPATIBILITIES: If any feat's content mentions incompatibilities or conflicts with other feats, enforce them strictly in both directions.

5. If the feat has NO prerequisites and no restrictions apply, allow it.

6. Be lenient about ambiguous requirements — if you're genuinely unsure whether a requirement is met, allow it.

Use the validate_feat tool to return your verdict.`;

    // Build pick context string
    let pickContext = "";
    if (pickType === "level" && level != null) {
      pickContext = `The player is picking this as their LEVEL ${level} feat.`;
    } else if (pickType === "free") {
      pickContext = `The player is adding this as a FREE feat (bonus feat outside level progression).`;
    } else if (pickType === "subfeat" && parentFeatTitle) {
      pickContext = `The player is picking this as a SUBFEAT of "${parentFeatTitle}". Check whether "${parentFeatTitle}" allows subfeats.`;
    } else if (pickType === "subfeat") {
      pickContext = `The player is picking this as a SUBFEAT of another feat. Check whether the parent feat allows subfeats.`;
    }

    const userPrompt = `Character: ${character.name}
${character.description ? `Description: ${character.description}` : ""}

Current feats (including subfeats):
${currentFeatsFormatted || "(none)"}

${pickContext}

Wants to acquire:
${targetFeatFormatted}

Does this character meet all prerequisites for this feat?`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_feat",
              description: "Return whether the character can acquire this feat and why.",
              parameters: {
                type: "object",
                properties: {
                  allowed: { type: "boolean", description: "Whether the character meets all prerequisites" },
                  reason: { type: "string", description: "Brief explanation of why the feat is allowed or blocked" },
                },
                required: ["allowed", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "validate_feat" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ allowed: true, reason: "Validation unavailable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ allowed: true, reason: "Could not parse validation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ allowed: !!result.allowed, reason: result.reason || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-feat error:", e);
    return new Response(JSON.stringify({ allowed: true, reason: "Validation error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
