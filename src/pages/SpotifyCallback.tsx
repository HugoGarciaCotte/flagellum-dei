import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FullPageLoader from "@/components/FullPageLoader";
import { useTranslation } from "@/i18n/useTranslation";

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const spotifyError = params.get("error");
      const returnPath = sessionStorage.getItem("spotify_return_path") || "/";
      const codeVerifier = sessionStorage.getItem("spotify_code_verifier");

      if (spotifyError) {
        sessionStorage.removeItem("spotify_code_verifier");
        sessionStorage.removeItem("spotify_return_path");
        navigate(returnPath);
        return;
      }

      if (!code || !codeVerifier) {
        setError("Missing authorization code");
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("spotify-token-exchange", {
          body: {
            grant_type: "authorization_code",
            code,
            redirect_uri: `${window.location.origin}/spotify-callback`,
            code_verifier: codeVerifier,
          },
        });

        sessionStorage.removeItem("spotify_code_verifier");
        sessionStorage.removeItem("spotify_return_path");

        if (fnError || data?.error) {
          setError(data?.error || fnError?.message || "Token exchange failed");
          return;
        }

        // Store access token temporarily so the player can pick it up
        sessionStorage.setItem("spotify_access_token", data.access_token);
        sessionStorage.setItem("spotify_token_expires", String(Date.now() + data.expires_in * 1000));

        navigate(returnPath);
      } catch (e: any) {
        setError(e.message || "Unknown error");
      }
    };

    handle();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="text-center space-y-4">
          <p className="text-destructive font-display text-lg">{t("spotify.connectionFailed")}</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button className="text-primary underline" onClick={() => navigate("/")}>
            {t("spotify.returnHome")}
          </button>
        </div>
      </div>
    );
  }

  return <FullPageLoader message={t("spotify.connecting")} />;
};

export default SpotifyCallback;
