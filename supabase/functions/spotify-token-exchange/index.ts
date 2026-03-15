import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
  const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: "Spotify credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { grant_type, code, redirect_uri, refresh_token, code_verifier } = body;

    // Build Spotify token request
    const params = new URLSearchParams();
    params.set("client_id", SPOTIFY_CLIENT_ID);
    params.set("client_secret", SPOTIFY_CLIENT_SECRET);

    if (grant_type === "authorization_code") {
      params.set("grant_type", "authorization_code");
      params.set("code", code);
      params.set("redirect_uri", redirect_uri);
      if (code_verifier) params.set("code_verifier", code_verifier);
    } else if (grant_type === "refresh_token") {
      params.set("grant_type", "refresh_token");
      params.set("refresh_token", refresh_token);
    } else {
      return new Response(JSON.stringify({ error: "Invalid grant_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Spotify token error:", tokenData);
      return new Response(JSON.stringify({ error: tokenData.error_description || "Token exchange failed" }), {
        status: tokenRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist refresh_token in user's profile if present
    const authHeader = req.headers.get("authorization");
    if (authHeader && tokenData.refresh_token) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);

      // Decode JWT to get user id
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

      if (user) {
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        await supabase
          .from("profiles")
          .update({
            spotify_refresh_token: tokenData.refresh_token,
            spotify_access_token: tokenData.access_token,
            spotify_token_expires_at: expiresAt,
          })
          .eq("user_id", user.id);
      }
    }

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("spotify-token-exchange error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
