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
    return `https://open.spotify.com/embed${path}?utm_source=generator&theme=0`;
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

  if (!activeUrl || !online) return null;

  const posClass = position === "left" ? "left-4" : "right-4";

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`fixed bottom-20 ${posClass} z-40 flex items-center gap-2 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg px-4 py-2 hover:bg-accent transition-colors`}
      >
        <Music className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
          {displayName}
        </span>
      </button>
    );
  }

  return (
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
              title="Open in Spotify"
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

      {/* Spotify Embed */}
      {embedUrl ? (
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
      ) : (
        <div className="p-4 text-sm text-muted-foreground text-center">
          Invalid Spotify URL
        </div>
      )}
    </div>
  );
};

export default SpotifyPlayer;
