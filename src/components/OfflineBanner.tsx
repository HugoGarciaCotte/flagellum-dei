import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";

export const OfflineBanner = () => {
  const online = useNetworkStatus();

  if (online) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur">
      <WifiOff className="h-4 w-4" />
      You're offline — using cached data
    </div>
  );
};
