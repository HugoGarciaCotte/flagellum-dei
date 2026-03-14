import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERATABLE_FIELDS = [
  "description",
  "prerequisites",
  "specialities",
  "blocking",
  "unlocks_categories",
  "subfeats",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { feat_title, feat_categories, feat_content, feat_raw_content, fields } = await req.json();

    if (!feat_title || !fields?.length) {
      return new Response(
        JSON.stringify({ error: "feat_title and fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requestedFields = fields.filter((f: string) => GENERATABLE_FIELDS.includes(f as any));
    if (requestedFields.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid fields requested" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isArchetype = (feat_categories || []).includes("Archetype");

    const systemPrompt = `You are a metadata extraction assistant for a dark medieval horror tabletop RPG called "Flagellum Dei" set during the Black Death (1347).

You will receive a feat's title, categories, and content. Extract the requested metadata fields following these strict rules:

## description
- For Archetypes: write a SHORT one-sentence roleplay/personality flavor description. Focus on who this character is, their attitude, their drive. Do NOT describe mechanical effects.
- For general feats: write a SHORT one-sentence description of the practical mechanical effect. Be concise and literal.

## prerequisites
- Extract prerequisite requirements literally from the content text (e.g. "Strength 14", "Level 3", "Must have Faith feat").
- Return as a single string, or null if no prerequisites exist.

## specialities
- Only generate if the content shows a parenthesized pattern like "Feat (Speciality)" AND those specialities are NOT standalone feats in the game.
- Return as an array of strings, or an empty array if none apply.

## blocking
- List feat titles that are explicitly stated as incompatible or mutually exclusive in the content.
- Return as an array of strings, or an empty array if none.

## unlocks_categories
- List category names that this feat explicitly grants access to (e.g. an Archetype that unlocks "Faith" feats).
- Return as an array of strings, or an empty array if none.

## subfeats
- For Archetypes: standardize to the 3-slot pattern:
  - Slot 1: kind "type", filter "Faith" (the character's religious conviction)
  - Slot 2: kind "type", filter "Core" (the archetype's core ability)
  - Slot 3: kind "type", filter "Pool" (a resource pool)
  Only deviate if the content clearly defines a different structure.
- For non-Archetypes: parse subfeat slots from content if present. Each slot has: slot (number), kind ("fixed"|"list"|"type"), and optionally feat_title (for fixed), options (for list), or filter (for type).
- Return as an array of slot objects, or an empty array if none.

Return ONLY the requested fields via the tool call.`;

    const userPrompt = `Feat: "${feat_title}"
Categories: ${JSON.stringify(feat_categories || [])}
${isArchetype ? "(This is an Archetype feat)" : ""}

Content:
${feat_content || "(no content)"}

${feat_raw_content ? `Raw wikitext content:\n${feat_raw_content}` : ""}

Please extract the following fields: ${requestedFields.join(", ")}`;

    // Build tool properties for only the requested fields
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of requestedFields) {
      required.push(field);
      switch (field) {
        case "description":
          properties.description = { type: "string", description: "One-sentence description" };
          break;
        case "prerequisites":
          properties.prerequisites = { type: ["string", "null"], description: "Prerequisites string or null" };
          break;
        case "specialities":
          properties.specialities = {
            type: "array", items: { type: "string" },
            description: "List of specialities or empty array",
          };
          break;
        case "blocking":
          properties.blocking = {
            type: "array", items: { type: "string" },
            description: "List of incompatible feat titles or empty array",
          };
          break;
        case "unlocks_categories":
          properties.unlocks_categories = {
            type: "array", items: { type: "string" },
            description: "List of unlocked category names or empty array",
          };
          break;
        case "subfeats":
          properties.subfeats = {
            type: "array",
            items: {
              type: "object",
              properties: {
                slot: { type: "number" },
                kind: { type: "string", enum: ["fixed", "list", "type"] },
                feat_title: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                filter: { type: "string" },
              },
              required: ["slot", "kind"],
            },
            description: "Subfeat slot definitions or empty array",
          };
          break;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "set_feat_metadata",
              description: "Set the extracted metadata fields for the feat.",
              parameters: {
                type: "object",
                properties,
                required,
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_feat_metadata" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI metadata generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      // Fallback: try message content
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return new Response(
            JSON.stringify(parsed),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        } catch {
          // ignore
        }
      }
      return new Response(
        JSON.stringify({ error: "No structured output from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(
      JSON.stringify(args),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-feat-metadata error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
