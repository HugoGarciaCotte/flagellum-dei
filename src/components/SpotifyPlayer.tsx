import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Music, X, ExternalLink } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

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
    // Path like /playlist/ID or /track/ID — strip locale prefix if present
    const path = u.pathname.replace(/^\/intl-[a-z]+/, "");
    const parts = path.split("/").filter(Boolean); // e.g. ["playlist","3abc..."]
    if (parts.length >= 2) return `spotify:${parts[0]}:${parts[1]}`;
    return null;
  } catch {
    return null;
  }
}

// Augment window for the Spotify IFrame API callback
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: any) => void;
    SpotifyIframeApi?: any;
  }
}

const IFRAME_API_URL = "https://open.spotify.com/embed/iframe-api/v1";

const SpotifyPlayer = ({
  position = "left",
  playlistUrl,
  playlistName,
  playTrackUrl,
}: SpotifyPlayerProps) => {
  const [expanded, setExpanded] = useState(false);
  const online = useNetworkStatus();

  const apiRef = useRef<any>(null);
  const controllerRef = useRef<any>(null);
  const expandedContainerRef = useRef<HTMLDivElement>(null);
  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  const [apiReady, setApiReady] = useState(false);

  // Track takes priority over playlist
  const activeUrl = playTrackUrl || playlistUrl;
  const spotifyUri = useMemo(() => (activeUrl ? toSpotifyUri(activeUrl) : null), [activeUrl]);

  const displayName = playTrackUrl ? "♫ Track" : playlistName || "Spotify";

  // Load the Spotify IFrame API script once
  useEffect(() => {
    if (window.SpotifyIframeApi) {
      apiRef.current = window.SpotifyIframeApi;
      setApiReady(true);
      return;
    }

    // Check if script already loading
    if (document.querySelector(`script[src="${IFRAME_API_URL}"]`)) return;

    const script = document.createElement("script");
    script.src = IFRAME_API_URL;
    script.async = true;

    window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
      window.SpotifyIframeApi = IFrameAPI;
      apiRef.current = IFrameAPI;
      setApiReady(true);
    };

    document.body.appendChild(script);
  }, []);

  // Create / recreate controller when URI changes or API becomes ready
  useEffect(() => {
    if (!apiReady || !spotifyUri) return;
    const container = hiddenContainerRef.current;
    if (!container) return;

    // Destroy previous controller
    if (controllerRef.current) {
      try { controllerRef.current.destroy?.(); } catch {}
      controllerRef.current = null;
    }
    container.innerHTML = "";

    apiRef.current.createController(
      container,
      { uri: spotifyUri, height: 152, width: "100%" },
      (controller: any) => {
        controllerRef.current = controller;
        controller.addListener("ready", () => {
          controller.play();
        });
      }
    );

    return () => {
      if (controllerRef.current) {
        try { controllerRef.current.destroy?.(); } catch {}
        controllerRef.current = null;
      }
    };
  }, [apiReady, spotifyUri]);

  if (!activeUrl || !online || !spotifyUri) return null;

  const posClass = position === "left" ? "left-4" : "right-4";

  return (
    <>
      {/* Pill button (visible when collapsed) */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={`fixed bottom-20 ${posClass} z-40 flex items-center gap-2 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg px-4 py-2 hover:bg-accent transition-colors`}
        >
          <Music className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
            {displayName}
          </span>
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          className={`fixed bottom-20 ${posClass} z-40 w-[340px] rounded-xl bg-card/95 backdrop-blur border border-border shadow-2xl overflow-hidden`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {displayName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-accent transition-colors"
                title="Open in Spotify"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        Single persistent container for the Spotify embed.
        When expanded, positioned inside the panel area; when collapsed, off-screen.
        Always mounted to avoid destroy/recreate on toggle.
      */}
      <div
        ref={hiddenContainerRef}
        className={
          expanded
            ? `fixed bottom-20 ${posClass} z-[41] w-[340px] rounded-b-xl overflow-hidden`
            : "fixed -z-50 opacity-0 pointer-events-none"
        }
        style={
          expanded
            ? { marginTop: "42px" } // offset below the header bar
            : { position: "absolute", left: "-9999px" }
        }
      />
    </>
  );
};

export default SpotifyPlayer;
