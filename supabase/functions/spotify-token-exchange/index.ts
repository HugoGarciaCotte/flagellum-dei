import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";

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

    // client_id grant: harmless, no auth required.
    if (grant_type === "client_id") {
      return new Response(JSON.stringify({ client_id: SPOTIFY_CLIENT_ID }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other grant types require a signed-in app user.
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

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

    if (tokenData.refresh_token) {
      const admin = createClient(supabaseUrl, serviceKey);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      await admin
        .from("user_spotify_tokens")
        .upsert({
          user_id: user.id,
          refresh_token: tokenData.refresh_token,
          access_token: tokenData.access_token,
          expires_at: expiresAt,
        });
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
