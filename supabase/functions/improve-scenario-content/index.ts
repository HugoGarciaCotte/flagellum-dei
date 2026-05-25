import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireOwner } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authRes = await requireOwner(req);
    if ("error" in authRes) return authRes.error;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { content, instruction } = await req.json();
    if (!content || !instruction) {
      return new Response(
        JSON.stringify({ error: "content and instruction are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a wikitext editor for a dark medieval horror tabletop RPG called "Flagellum Dei".

You will receive the current wikitext content of a scenario and a user instruction describing what to change.

## Wikitext format reference
- Headings: == Title == (level 2), === Title === (level 3), etc.
- Bold: '''text''', Italic: ''text''
- Lists: * item, # numbered item
- Internal links: [[Target|Label]] or [[Target]]
- External links: [https://url text]
- Horizontal rule: ----
- Section close: ==== (bare equals on a line)

## Available metadata tags (insert on their own line)
- <!--@ background_image: URL @--> — sets background image for the section
- <!--@ playlist: URL | Name @--> — sets background music playlist
- <!--@ queue_track: URL | Name @--> — plays a one-time track
- {{Ambiance Track\\n| 5min = narration text\\n| 15min = narration text\\n}} — timed narration block

## Rules
- Return ONLY the full modified wikitext content. No explanations, no markdown code fences, no preamble.
- Preserve the existing structure, headings, and metadata tags unless the user explicitly asks to change them.
- Only modify what the user asks for. Keep everything else intact.
- Match the dark medieval horror tone of the game for any new narrative content.
- If the user asks to insert tags, use the exact syntax shown above.
- Do NOT wrap output in code blocks or add any commentary.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Here is the current scenario content:\n\n${content}\n\n---\n\nInstruction: ${instruction}`,
            },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required — please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let improved = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if the model wraps output
    improved = improved.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();

    return new Response(
      JSON.stringify({ improved_content: improved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("improve-scenario-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
