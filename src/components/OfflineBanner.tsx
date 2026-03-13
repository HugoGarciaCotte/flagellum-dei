import { useState, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Loader2, Check } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

export const OfflineBanner = () => {
  const online = useNetworkStatus();
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const onSyncing = () => setSyncing(true);
    const onSynced = () => {
      setSyncing(false);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    };
    window.addEventListener("sync-syncing", onSyncing);
    window.addEventListener("sync-synced", onSynced);
    return () => {
      window.removeEventListener("sync-syncing", onSyncing);
      window.removeEventListener("sync-synced", onSynced);
    };
  }, []);

  if (justSynced && online) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur">
        <Check className="h-4 w-4" />
        {t("common.allSynced")}
      </div>
    );
  }

  if (online && !syncing) return null;

  if (syncing) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary/90 text-primary-foreground text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("common.syncing")}
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-destructive/90 text-destructive-foreground text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur">
      <WifiOff className="h-4 w-4" />
      {t("common.offlineSavedLocally")}
    </div>
  );
};
