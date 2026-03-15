import { useEffect } from "react";
import FullPageLoader from "@/components/FullPageLoader";

/**
 * Lightweight page that handles the Spotify OAuth redirect.
 * The actual token exchange is handled by useSpotifyAuth when it detects
 * the ?code= param on this route. This component just shows a loader.
 */
const SpotifyCallback = () => {
  useEffect(() => {
    // If useSpotifyAuth hasn't redirected after 10s, go home
    const timeout = setTimeout(() => {
      window.location.replace("/");
    }, 10_000);
    return () => clearTimeout(timeout);
  }, []);

  return <FullPageLoader message="Connecting to Spotify…" />;
};

export default SpotifyCallback;
