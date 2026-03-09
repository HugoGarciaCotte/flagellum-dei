import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate icon via AI
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content:
                "Generate a square app icon (512x512). Render ONLY the Unicode alchemical symbol for antimony '🜹' in gold color (#C6930A) perfectly centered on a solid black (#141318) background. The symbol must be large, filling most of the square, vertically and horizontally centered with no extra space on top. No other text, no decorations, just the single gold alchemical antimony symbol on black.",
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error(`AI gateway returned ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const imageUrl =
      aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) throw new Error("No image returned from AI");

    // Extract base64 data
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = decode(base64Data);

    // Upload as 512 icon
    const { error: err512 } = await supabase.storage
      .from("app-assets")
      .upload("pwa-icon-512.png", imageBytes, {
        contentType: "image/png",
        upsert: true,
      });
    if (err512) throw new Error(`Upload 512 failed: ${err512.message}`);

    // Use same image for 192 (browsers will scale)
    const { error: err192 } = await supabase.storage
      .from("app-assets")
      .upload("pwa-icon-192.png", imageBytes, {
        contentType: "image/png",
        upsert: true,
      });
    if (err192) throw new Error(`Upload 192 failed: ${err192.message}`);

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/app-assets/pwa-icon-512.png`;

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pwa-icon error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
