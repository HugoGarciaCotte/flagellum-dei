import { useState, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Loader2, Check } from "lucide-react";
import { getQueueLength } from "@/lib/offlineQueue";

export const OfflineBanner = () => {
  const online = useNetworkStatus();
  const [queueCount, setQueueCount] = useState(getQueueLength());
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const update = () => setQueueCount(getQueueLength());
    window.addEventListener("offline-queue-change", update);
    return () => window.removeEventListener("offline-queue-change", update);
  }, []);

  useEffect(() => {
    const onSyncing = () => setSyncing(true);
    const onSynced = () => {
      setSyncing(false);
      setJustSynced(true);
      setQueueCount(getQueueLength());
      setTimeout(() => setJustSynced(false), 3000);
    };
    window.addEventListener("offline-queue-syncing", onSyncing);
    window.addEventListener("offline-queue-synced", onSynced);
    return () => {
      window.removeEventListener("offline-queue-syncing", onSyncing);
      window.removeEventListener("offline-queue-synced", onSynced);
    };
  }, []);

  // Show sync success briefly even when online
  if (justSynced && online) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur">
        <Check className="h-4 w-4" />
        All changes synced
      </div>
    );
  }

  if (online && !syncing) return null;

  if (syncing) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin" />
        Syncing changes...
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur">
      <WifiOff className="h-4 w-4" />
      {queueCount > 0
        ? `You're offline — ${queueCount} change${queueCount > 1 ? "s" : ""} saved locally`
        : "You're offline — using cached data"}
    </div>
  );
};
