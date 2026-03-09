import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { type, archetype, faith, feats, description } = await req.json();

    let prompt: string;
    if (type === "description") {
      const parts = [`Archetype: ${archetype || "Unknown"}`];
      if (faith && faith !== "None") parts.push(`Faith: ${faith}`);
      if (feats && feats.length > 0) parts.push(`Feats: ${feats.join(", ")}`);
      prompt = `You are a narrator for a dark medieval tabletop RPG set in Europe around 1340. Write a single epic sentence (max 30 words) describing a character with these traits:\n${parts.join("\n")}\nOutput ONLY the sentence, nothing else. Make it dramatic and evocative. Do not use the character's name.`;
    } else if (type === "name") {
      prompt = `Generate a single historically authentic name (first name and surname) for a person living in Europe around 1340 AD. The character is described as: "${description || "a mysterious traveler"}". Their archetype is: ${archetype || "unknown"}.\nThe name should sound period-appropriate and could be from any European origin: French, English, German, Flemish, Italian, Castilian, or Eastern European.\nOutput ONLY the full name, nothing else. No quotes, no explanation.`;
    } else {
      throw new Error("Invalid type. Use 'description' or 'name'.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();
    if (!result) throw new Error("Empty AI response");

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-character-details error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
