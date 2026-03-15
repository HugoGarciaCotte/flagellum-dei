import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const { grant_type } = body;

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
    console.log("Spotify client_id being used:", clientId);
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    // Service-role client (shared across branches)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let spotifyParams: URLSearchParams;

    if (grant_type === "authorization_code") {
      const { code, redirect_uri, code_verifier } = body;
      if (!code || !redirect_uri || !code_verifier) {
        return new Response(
          JSON.stringify({ error: "Missing code, redirect_uri, or code_verifier" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      spotifyParams = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        code_verifier,
      });
    } else if (grant_type === "refresh_token") {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("spotify_refresh_token")
        .eq("user_id", userId)
        .single();

      if (!profile?.spotify_refresh_token) {
        return new Response(
          JSON.stringify({ error: "No refresh token found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      spotifyParams = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: profile.spotify_refresh_token,
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid grant_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange with Spotify
    const spotifyRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: spotifyParams.toString(),
    });

    const spotifyData = await spotifyRes.json();

    if (!spotifyRes.ok) {
      console.error("Spotify error:", JSON.stringify(spotifyData));
      return new Response(
        JSON.stringify({ error: spotifyData.error_description || spotifyData.error || "Spotify error" }),
        { status: spotifyRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(
      Date.now() + spotifyData.expires_in * 1000
    ).toISOString();

    await serviceClient
      .from("profiles")
      .update({
        spotify_access_token: spotifyData.access_token,
        spotify_refresh_token:
          spotifyData.refresh_token ?? undefined,
        spotify_token_expires_at: expiresAt,
      })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        access_token: spotifyData.access_token,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("spotify-token-exchange error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
