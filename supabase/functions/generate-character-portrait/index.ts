import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { characterId, featNames: clientFeatNames } = await req.json();
    if (!characterId) throw new Error("Missing characterId");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: character, error: charError } = await adminClient
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .single();
    if (charError || !character) throw new Error("Character not found");
    if (character.user_id !== user.id) throw new Error("Not your character");

    // Use client-provided feat names, or fall back to feat_ids only
    let featNames: string[] = clientFeatNames || [];
    if (featNames.length === 0) {
      const { data: charFeats } = await adminClient
        .from("character_feats")
        .select("feat_id")
        .eq("character_id", characterId);
      featNames = (charFeats ?? []).map((cf: any) => cf.feat_id);
    }

    // Step 1: Generate prompt
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
            content: `Create an image prompt for this character:\nName: ${character.name}\nDescription: ${character.description || "No description"}\nFeats/Abilities: ${featNames.length > 0 ? featNames.join(", ") : "None yet"}`,
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
      const errText = await imageResponse.text();
      console.error("Image generation failed:", imageResponse.status, errText);
      throw new Error("Failed to generate image");
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) throw new Error("No image in response");

    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Step 3: Upload to storage
    const filePath = `${user.id}/${characterId}.png`;
    const { error: uploadError } = await adminClient.storage
      .from("character-portraits")
      .upload(filePath, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = adminClient.storage
      .from("character-portraits")
      .getPublicUrl(filePath);
    const portraitUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await adminClient
      .from("characters")
      .update({ portrait_url: portraitUrl })
      .eq("id", characterId);
    if (updateError) throw new Error(`Update failed: ${updateError.message}`);

    return new Response(JSON.stringify({ portrait_url: portraitUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-character-portrait error:", e);
    const status = (e as Error).message === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
