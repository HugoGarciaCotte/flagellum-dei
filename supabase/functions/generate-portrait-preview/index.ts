import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const { description, featNames } = await req.json();

    if (!description && (!featNames || featNames.length === 0)) {
      throw new Error("Provide a description or feat names");
    }

    // Step 1: Generate image prompt
    const promptResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at writing image generation prompts for fantasy RPG character portraits. Output ONLY the prompt text, nothing else. The prompt should describe a painterly fantasy bust portrait suitable for a tabletop RPG character sheet. Keep it under 200 words.",
          },
          {
            role: "user",
            content: `Create an image prompt for this character:\nDescription: ${description || "No description"}\nFeats/Abilities: ${featNames?.length > 0 ? featNames.join(", ") : "None yet"}`,
          },
        ],
      }),
    });

    if (!promptResponse.ok) {
      const errText = await promptResponse.text();
      console.error("Prompt generation failed:", promptResponse.status, errText);
      throw new Error("Failed to generate prompt");
    }

    const promptData = await promptResponse.json();
    const imagePrompt = promptData.choices?.[0]?.message?.content?.trim();
    if (!imagePrompt) throw new Error("Empty prompt generated");

    console.log("Generated prompt:", imagePrompt);

    // Step 2: Generate image
    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!imageResponse.ok) {
      const status = imageResponse.status;
      const errText = await imageResponse.text();
      console.error("Image generation failed:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to generate image");
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) throw new Error("No image in response");

    return new Response(JSON.stringify({ image_data_url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-portrait-preview error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
