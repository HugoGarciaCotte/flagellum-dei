import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SPOTIFY_CLIENT_ID = "0f359b30c2484879a3d42b57ac0aabab";
const SPOTIFY_SCOPES = "streaming user-read-email user-read-private";
const VERIFIER_KEY = "spotify_pkce_verifier";
const RETURN_KEY = "spotify_return_path";

function generateRandomString(len: number) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

async function generateCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface SpotifyAuthState {
  accessToken: string | null;
  expiresAt: string | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
}

export function useSpotifyAuth(): SpotifyAuthState {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshingRef = useRef(false);

  // Load tokens from profile on mount
  useEffect(() => {
    if (!user) {
      setAccessToken(null);
      setExpiresAt(null);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("spotify_access_token, spotify_token_expires_at")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setAccessToken(data.spotify_access_token);
          setExpiresAt(data.spotify_token_expires_at);
        }
      } catch {}
      setIsLoading(false);
    };
    load();
  }, [user]);

  // Handle OAuth callback (code in URL)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || !window.location.pathname.includes("/spotify-callback")) return;

    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    const returnPath = sessionStorage.getItem(RETURN_KEY) || "/";
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(RETURN_KEY);

    if (!verifier) {
      window.location.replace(returnPath);
      return;
    }

    const exchange = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData.session?.access_token;
        if (!jwt) throw new Error("No session");

        const res = await supabase.functions.invoke("spotify-token-exchange", {
          body: {
            grant_type: "authorization_code",
            code,
            redirect_uri: `${window.location.origin}/spotify-callback`,
            code_verifier: verifier,
          },
        });

        if (res.error) throw res.error;
        const result = res.data as { access_token: string; expires_at: string };
        setAccessToken(result.access_token);
        setExpiresAt(result.expires_at);
      } catch (err) {
        console.error("Spotify token exchange failed:", err);
      }
      window.history.replaceState({}, "", returnPath);
    };
    exchange();
  }, [user]);

  const connect = useCallback(async () => {
    const verifier = generateRandomString(64);
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search);

    const redirectUri = `${window.location.origin}/spotify-callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID,
      scope: SPOTIFY_SCOPES,
      redirect_uri: redirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }, []);

  const disconnect = useCallback(async () => {
    if (!user) return;
    setAccessToken(null);
    setExpiresAt(null);
    try {
      await supabase
        .from("profiles")
        .update({
          spotify_access_token: null,
          spotify_refresh_token: null,
          spotify_token_expires_at: null,
        } as any)
        .eq("user_id", user.id);
    } catch {}
  }, [user]);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!accessToken) return null;

    // Check if token is still valid (with 60s buffer)
    if (expiresAt && new Date(expiresAt).getTime() > Date.now() + 60_000) {
      return accessToken;
    }

    // Refresh
    if (refreshingRef.current) {
      // Wait for ongoing refresh
      await new Promise((r) => setTimeout(r, 1000));
      return accessToken;
    }

    refreshingRef.current = true;
    try {
      const res = await supabase.functions.invoke("spotify-token-exchange", {
        body: { grant_type: "refresh_token" },
      });

      if (res.error) throw res.error;
      const result = res.data as { access_token: string; expires_at: string };
      setAccessToken(result.access_token);
      setExpiresAt(result.expires_at);
      return result.access_token;
    } catch (err) {
      console.error("Spotify token refresh failed:", err);
      setAccessToken(null);
      setExpiresAt(null);
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [accessToken, expiresAt]);

  return {
    accessToken,
    expiresAt,
    isConnected: !!accessToken,
    isLoading,
    connect,
    disconnect,
    getValidToken,
  };
}
