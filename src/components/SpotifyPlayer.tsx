import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Music, X, ExternalLink, Play, Pause, LogIn, LogOut } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import { useTranslation } from "@/i18n/useTranslation";

interface SpotifyPlayerProps {
  position?: "left" | "right";
  playlistUrl?: string;
  playlistName?: string;
  playTrackUrl?: string;
}

/** Convert a Spotify open URL to a spotify: URI */
function toSpotifyUri(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("spotify.com")) return null;
    const path = u.pathname.replace(/^\/intl-[a-z]+/, "");
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) return `spotify:${parts[0]}:${parts[1]}`;
    return null;
  } catch {
    return null;
  }
}

// Augment window for the Spotify Web Playback SDK
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: any;
  }
}

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";

const SpotifyPlayer = ({
  position = "left",
  playlistUrl,
  playlistName,
  playTrackUrl,
}: SpotifyPlayerProps) => {
  const [expanded, setExpanded] = useState(false);
  const online = useNetworkStatus();
  const { t } = useTranslation();
  const spotify = useSpotifyAuth();

  const playerRef = useRef<any>(null);
  const deviceIdRef = useRef<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [artistName, setArtistName] = useState<string | null>(null);
  const [premiumError, setPremiumError] = useState(false);

  const activeUrl = playTrackUrl || playlistUrl;
  const spotifyUri = useMemo(() => (activeUrl ? toSpotifyUri(activeUrl) : null), [activeUrl]);
  const displayName = trackName || playlistName || t("spotify.defaultPlaylist");

  // Load Spotify Web Playback SDK script once
  useEffect(() => {
    if (window.Spotify) {
      setSdkReady(true);
      return;
    }
    if (document.querySelector(`script[src="${SDK_URL}"]`)) return;

    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Create / recreate player when SDK ready and token available
  useEffect(() => {
    if (!sdkReady || !spotify.isConnected) return;

    const initPlayer = async () => {
      const token = await spotify.getValidToken();
      if (!token) return;

      // Destroy previous player
      if (playerRef.current) {
        try { playerRef.current.disconnect(); } catch {}
        playerRef.current = null;
        deviceIdRef.current = null;
      }

      const player = new window.Spotify.Player({
        name: "Flagellum Dei",
        getOAuthToken: async (cb: (t: string) => void) => {
          const t = await spotify.getValidToken();
          cb(t || "");
        },
        volume: 0.5,
      });

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id;
        console.log("[Spotify SDK] Ready with device ID:", device_id);
      });

      player.addListener("not_ready", () => {
        deviceIdRef.current = null;
      });

      player.addListener("player_state_changed", (state: any) => {
        if (!state) {
          setIsPlaying(false);
          setTrackName(null);
          setArtistName(null);
          return;
        }
        setIsPlaying(!state.paused);
        const current = state.track_window?.current_track;
        if (current) {
          setTrackName(current.name);
          setArtistName(current.artists?.map((a: any) => a.name).join(", ") || null);
        }
      });

      player.addListener("initialization_error", ({ message }: { message: string }) => {
        console.error("[Spotify SDK] Init error:", message);
      });

      player.addListener("authentication_error", ({ message }: { message: string }) => {
        console.error("[Spotify SDK] Auth error:", message);
      });

      player.addListener("account_error", ({ message }: { message: string }) => {
        console.error("[Spotify SDK] Account error (Premium required?):", message);
        setPremiumError(true);
      });

      const success = await player.connect();
      if (success) {
        playerRef.current = player;
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        try { playerRef.current.disconnect(); } catch {}
        playerRef.current = null;
        deviceIdRef.current = null;
      }
    };
  }, [sdkReady, spotify.isConnected]);

  // Play URI when it changes
  useEffect(() => {
    if (!spotifyUri || !deviceIdRef.current) return;

    const play = async () => {
      const token = await spotify.getValidToken();
      if (!token || !deviceIdRef.current) return;

      const body: any = {};
      if (spotifyUri.includes(":track:")) {
        body.uris = [spotifyUri];
      } else {
        body.context_uri = spotifyUri;
      }

      try {
        const res = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          console.error("[Spotify] Play failed:", res.status, await res.text());
        }
      } catch (err) {
        console.error("[Spotify] Play error:", err);
      }
    };

    play();
  }, [spotifyUri, spotify.getValidToken]);

  const togglePlay = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.togglePlay();
    }
  }, []);

  if (!online) return null;

  // Not connected — show connect button
  if (!spotify.isConnected && !spotify.isLoading) {
    const posClass = position === "left" ? "left-4" : "right-4";
    return (
      <button
        onClick={spotify.connect}
        className={`fixed bottom-20 ${posClass} z-40 flex items-center gap-2 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg px-4 py-2 hover:bg-accent transition-colors`}
      >
        <Music className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {t("spotify.connect")}
        </span>
      </button>
    );
  }

  if (spotify.isLoading) return null;

  const posClass = position === "left" ? "left-4" : "right-4";

  return (
    <>
      {/* Pill button (visible when collapsed) */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={`fixed bottom-20 ${posClass} z-40 flex items-center gap-2 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg px-4 py-2 hover:bg-accent transition-colors`}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Music className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
            {premiumError ? t("spotify.premiumRequired") : displayName}
          </span>
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          className={`fixed bottom-20 ${posClass} z-40 w-[340px] rounded-xl bg-card/95 backdrop-blur border border-border shadow-2xl overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {displayName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {activeUrl && (
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-accent transition-colors"
                  title={t("spotify.openInSpotify")}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Player controls */}
          <div className="px-4 py-3 space-y-3">
            {premiumError ? (
              <p className="text-sm text-destructive text-center">
                {t("spotify.premiumRequired")}
              </p>
            ) : (
              <>
                {/* Track info */}
                {trackName && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground truncate">{trackName}</p>
                    {artistName && (
                      <p className="text-xs text-muted-foreground truncate">{artistName}</p>
                    )}
                  </div>
                )}

                {/* Play/Pause */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={togglePlay}
                    className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Status text */}
                <p className="text-xs text-muted-foreground text-center">
                  {isPlaying ? t("spotify.playing") : t("spotify.paused")}
                </p>
              </>
            )}

            {/* Disconnect */}
            <button
              onClick={spotify.disconnect}
              className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-3 w-3" />
              {t("spotify.disconnect")}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SpotifyPlayer;
