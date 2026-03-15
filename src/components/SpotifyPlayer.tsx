import { useState, useEffect, useRef, useCallback } from "react";
import { Music, Play, Pause, SkipForward, SkipBack, X, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBottomOffset } from "@/hooks/useBottomOffset";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { initiateSpotifyLogin } from "@/lib/spotifyAuth";

const PLAYLIST_URI = "spotify:playlist:4GZgLYVRC7JG84Ftrmqu62";
const SPOTIFY_SDK_URL = "https://sdk.scdn.co/spotify-player.js";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

interface SpotifyPlayerProps {
  position?: "left" | "right";
}

const SpotifyPlayer = ({ position = "left" }: SpotifyPlayerProps) => {
  const isMobile = useIsMobile();
  const bannerOffset = useBottomOffset();
  const online = useNetworkStatus();
  const { user, isGuest, session } = useAuth();
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spotifyClientId, setSpotifyClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const sdkScriptRef = useRef<boolean>(false);

  // Load SDK script once
  useEffect(() => {
    if (sdkScriptRef.current || typeof window === "undefined") return;
    if (document.querySelector(`script[src="${SPOTIFY_SDK_URL}"]`)) {
      sdkScriptRef.current = true;
      if (window.Spotify) setSdkReady(true);
      return;
    }

    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);
    const script = document.createElement("script");
    script.src = SPOTIFY_SDK_URL;
    script.async = true;
    document.body.appendChild(script);
    sdkScriptRef.current = true;
  }, []);

  // Check for stored token on mount / after callback redirect
  useEffect(() => {
    const storedToken = sessionStorage.getItem("spotify_access_token");
    const storedExpiry = sessionStorage.getItem("spotify_token_expires");

    if (storedToken && storedExpiry && Date.now() < Number(storedExpiry)) {
      setAccessToken(storedToken);
      return;
    }

    // Try to refresh from profile
    if (!session?.access_token || isGuest) return;
    refreshTokenFromProfile();
  }, [session, isGuest]);

  const refreshTokenFromProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("spotify_refresh_token, spotify_access_token, spotify_token_expires_at")
        .eq("user_id", user.id)
        .single();

      if (!profile?.spotify_refresh_token) return;

      // Check if stored access token is still valid
      if (profile.spotify_access_token && profile.spotify_token_expires_at) {
        const expiresAt = new Date(profile.spotify_token_expires_at).getTime();
        if (Date.now() < expiresAt - 60000) {
          setAccessToken(profile.spotify_access_token);
          return;
        }
      }

      // Refresh
      const { data, error } = await supabase.functions.invoke("spotify-token-exchange", {
        body: { grant_type: "refresh_token", refresh_token: profile.spotify_refresh_token },
      });

      if (data?.access_token) {
        setAccessToken(data.access_token);
        sessionStorage.setItem("spotify_access_token", data.access_token);
        sessionStorage.setItem("spotify_token_expires", String(Date.now() + data.expires_in * 1000));
      }
    } catch {
      // silent - user just won't have Spotify
    }
  }, [user]);

  // Fetch client ID from edge function (we need it for the auth URL)
  useEffect(() => {
    // We store client ID as a secret but also need it client-side for PKCE
    // Fetch it via a lightweight call to the edge function
    const fetchClientId = async () => {
      try {
        const { data } = await supabase.functions.invoke("spotify-token-exchange", {
          body: { grant_type: "client_id" },
        });
        if (data?.client_id) setSpotifyClientId(data.client_id);
      } catch {
        // Will be fetched when user tries to connect
      }
    };
    if (online && !spotifyClientId) fetchClientId();
  }, [online, spotifyClientId]);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!sdkReady || !accessToken || playerRef.current) return;

    const spotifyPlayer = new window.Spotify.Player({
      name: "Flagellum Dei",
      getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
      volume: 0.5,
    });

    spotifyPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
      setDeviceId(device_id);
      setLoading(false);
    });

    spotifyPlayer.addListener("not_ready", () => {
      setDeviceId(null);
    });

    spotifyPlayer.addListener("player_state_changed", (state: any) => {
      if (!state) return;
      setIsPlaying(!state.paused);
      setCurrentTrack(state.track_window?.current_track ?? null);
    });

    spotifyPlayer.addListener("initialization_error", ({ message }: { message: string }) => {
      console.error("Spotify init error:", message);
      setError(t("spotify.premiumRequired"));
    });

    spotifyPlayer.addListener("authentication_error", ({ message }: { message: string }) => {
      console.error("Spotify auth error:", message);
      setAccessToken(null);
      sessionStorage.removeItem("spotify_access_token");
      sessionStorage.removeItem("spotify_token_expires");
      // Clear bad tokens from profile to prevent reload loop
      if (user) {
        supabase.from("profiles").update({
          spotify_access_token: null,
          spotify_refresh_token: null,
          spotify_token_expires_at: null,
        }).eq("user_id", user.id).then(() => {});
      }
    });

    setLoading(true);
    spotifyPlayer.connect();
    playerRef.current = spotifyPlayer;
    setPlayer(spotifyPlayer);

    return () => {
      spotifyPlayer.disconnect();
      playerRef.current = null;
    };
  }, [sdkReady, accessToken]);

  // Start playlist when device is ready
  useEffect(() => {
    if (!deviceId || !accessToken) return;

    const startPlayback = async () => {
      try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ context_uri: PLAYLIST_URI }),
        });
      } catch (e) {
        console.error("Failed to start playback:", e);
      }
    };

    startPlayback();
  }, [deviceId, accessToken]);

  const handleConnect = () => {
    if (!spotifyClientId) return;
    const returnPath = window.location.pathname + window.location.search;
    initiateSpotifyLogin(spotifyClientId, returnPath);
  };

  const togglePlay = () => player?.togglePlay();
  const nextTrack = () => player?.nextTrack();
  const prevTrack = () => player?.previousTrack();

  // Determine pill status
  const getPillStatus = (): { text: string; actionable: boolean } => {
    if (!online) return { text: t("spotify.offline"), actionable: false };
    if (isGuest) return { text: t("spotify.connectPrompt"), actionable: false };
    if (!accessToken) return { text: t("spotify.connectPrompt"), actionable: true };
    if (error) return { text: error, actionable: false };
    if (loading) return { text: "…", actionable: false };
    if (isPlaying && currentTrack) return { text: currentTrack.name, actionable: true };
    if (currentTrack) return { text: t("spotify.paused"), actionable: true };
    return { text: t("spotify.playing"), actionable: true };
  };

  const pillStatus = getPillStatus();
  const mobileBottom = bannerOffset + 16;
  const posClass = position === "right" ? "right-6" : "left-6";

  // Collapsed pill
  if (!expanded) {
    return (
      <div className={cn("fixed z-50", posClass)} style={{ bottom: isMobile ? mobileBottom : 24 }}>
        <button
          onClick={() => {
            if (!online) return;
            if (!accessToken && !isGuest) {
              handleConnect();
              return;
            }
            if (accessToken) setExpanded(true);
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm shadow-lg transition-all hover:shadow-xl",
            accessToken && isPlaying
              ? "bg-[#1DB954] text-white"
              : "bg-secondary text-secondary-foreground",
            !online && "opacity-60 cursor-default"
          )}
        >
          {!online ? (
            <WifiOff className="h-4 w-4 shrink-0" />
          ) : loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Music className="h-4 w-4 shrink-0" />
          )}
          <span className="font-semibold shrink-0">{t("spotify.pill")}</span>
          {pillStatus.text && (
            <span className="truncate max-w-[180px] opacity-90 text-xs">
              {pillStatus.text}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Expanded player panel
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
      <div
        className={cn("fixed z-50", posClass)}
        style={{ bottom: isMobile ? mobileBottom : 24 }}
      >
        <div className="bg-card border border-border rounded-xl shadow-2xl p-4 w-72 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Music className="h-4 w-4 text-[#1DB954]" />
              {t("spotify.pill")}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Track info */}
          {currentTrack && (
            <div className="flex items-center gap-3">
              {currentTrack.album?.images?.[0]?.url && (
                <img
                  src={currentTrack.album.images[0].url}
                  alt={currentTrack.album.name}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{currentTrack.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentTrack.artists?.map((a: any) => a.name).join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevTrack}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-white"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextTrack}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
        </div>
      </div>
    </>
  );
};

export default SpotifyPlayer;
