import { useState, useMemo } from "react";
import { Music, X, ExternalLink } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface SpotifyPlayerProps {
  position?: "left" | "right";
  playlistUrl?: string;
  playlistName?: string;
  playTrackUrl?: string;
}

/** Convert a Spotify open URL to an embed URL */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("spotify.com")) return null;
    // Path like /playlist/ID or /track/ID — strip locale prefix if present
    const path = u.pathname.replace(/^\/intl-[a-z]+/, "");
    return `https://open.spotify.com/embed${path}?utm_source=generator&theme=0&autoplay=1`;
  } catch {
    return null;
  }
}

const SpotifyPlayer = ({
  position = "left",
  playlistUrl,
  playlistName,
  playTrackUrl,
}: SpotifyPlayerProps) => {
  const [expanded, setExpanded] = useState(false);
  const online = useNetworkStatus();

  // Track takes priority over playlist
  const activeUrl = playTrackUrl || playlistUrl;
  const embedUrl = useMemo(() => (activeUrl ? toEmbedUrl(activeUrl) : null), [activeUrl]);

  const displayName = playTrackUrl ? "♫ Track" : playlistName || "Spotify";

  if (!activeUrl || !online || !embedUrl) return null;

  const posClass = position === "left" ? "left-4" : "right-4";

  const iframeEl = (
    <iframe
      key={embedUrl}
      src={embedUrl}
      width="100%"
      height="152"
      frameBorder={0}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      className="block"
    />
  );

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

      {/* Hidden iframe keeps playing when collapsed; visible panel when expanded */}
      {expanded ? (
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
          {iframeEl}
        </div>
      ) : (
        /* Keep iframe alive but invisible so playback continues */
        <div className="fixed -z-50 opacity-0 pointer-events-none h-0 w-0 overflow-hidden">
          {iframeEl}
        </div>
      )}
    </>
  );
};

export default SpotifyPlayer;
