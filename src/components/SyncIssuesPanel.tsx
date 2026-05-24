import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getSyncErrors, clearSyncErrors, type SyncError } from "@/lib/localStore";
import { pushAll } from "@/lib/syncManager";

/**
 * Surfaces persisted sync errors (e.g. failed pushes). Tap to inspect, retry, or dismiss.
 * Hidden when there are no recorded errors.
 */
export const SyncIssuesPanel = () => {
  const [errors, setErrors] = useState<SyncError[]>(getSyncErrors);
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const handler = () => setErrors(getSyncErrors());
    window.addEventListener("sync-errors-change", handler);
    window.addEventListener("sync-error", handler);
    window.addEventListener("sync-synced", handler);
    return () => {
      window.removeEventListener("sync-errors-change", handler);
      window.removeEventListener("sync-error", handler);
      window.removeEventListener("sync-synced", handler);
    };
  }, []);

  if (errors.length === 0) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await pushAll();
    } finally {
      setRetrying(false);
      setErrors(getSyncErrors());
    }
  };

  const handleDismiss = () => {
    clearSyncErrors();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/20 transition-colors"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>
            {errors.length} change{errors.length === 1 ? "" : "s"} couldn't sync — tap for details
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync issues</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {errors.map((e, i) => (
            <div
              key={`${e.at}-${i}`}
              className="rounded-md border border-border bg-muted/30 p-2 text-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-muted-foreground">{e.table}</span>
                <span className="text-muted-foreground">
                  {new Date(e.at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground/90 break-words">{e.message}</p>
              {e.ids?.length > 0 && (
                <p className="font-mono text-[10px] text-muted-foreground break-all">
                  {e.ids.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleRetry}
            disabled={retrying}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
            Retry now
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleDismiss}>
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncIssuesPanel;
