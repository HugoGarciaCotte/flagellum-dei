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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { key, english_text, target_locale, screen, html_context } = await req.json();

    if (!english_text || !target_locale) {
      return new Response(
        JSON.stringify({ error: "english_text and target_locale are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const localeNames: Record<string, string> = { fr: "French" };
    const targetName = localeNames[target_locale] || target_locale;

    const systemPrompt = `You are a professional translator for a dark medieval horror tabletop RPG called "Flagellum Dei" set during the Black Death (1347). Translate the given English text to ${targetName}.

Rules:
- Produce a natural, fluent translation appropriate for the UI context
- Preserve any HTML tags, links, CSS classes, and formatting exactly as they are
- Do NOT translate proper nouns like "Flagellum Dei", "Danse Macabre", "Prima", "Lovable", "GitHub"
- Match the tone: dark, atmospheric, medieval
- Do not translate literally — rewrite the meaning in the target language with full literary freedom. It is acceptable to lose minor nuances if the result reads more naturally and elegantly
- Return ONLY the translated text, nothing else — no quotes, no explanations`;

    const userPrompt = html_context
      ? `Screen: ${screen}\nKey: ${key}\n\nHTML context where this text appears:\n${html_context}\n\nText to translate:\n${english_text}`
      : `Screen: ${screen}\nKey: ${key}\n\nText to translate:\n${english_text}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
        JSON.stringify({ error: "AI translation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const translated_text = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ translated_text }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-translation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
