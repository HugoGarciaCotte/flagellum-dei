import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getSyncErrors,
  clearSyncErrors,
  getQuarantine,
  retryQuarantined,
  discardQuarantined,
  getDirtyRows,
  type SyncError,
  type QuarantineEntry,
} from "@/lib/localStore";
import { pushAll, pullAll } from "@/lib/syncManager";
import { purgeSwRestCaches } from "@/lib/swCachePurge";

/**
 * §5.7 / §6.3 — Sync issues panel with the repair-synchronization ladder.
 *
 * Surfaces three things:
 * 1. Transient sync errors (retryable)
 * 2. Quarantined rows (individually retry-or-discard)
 * 3. A "Repair synchronization" ladder that clears SW caches, pulls fresh,
 *    then re-pushes anything still queued.
 */
export const SyncIssuesPanel = () => {
  const [errors, setErrors] = useState<SyncError[]>(getSyncErrors);
  const [quarantine, setQuarantine] = useState<QuarantineEntry[]>(getQuarantine);
  const [pendingCount, setPendingCount] = useState<number>(() => getDirtyRows().length);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"retry" | "repair" | null>(null);

  useEffect(() => {
    const refresh = () => {
      setErrors(getSyncErrors());
      setQuarantine(getQuarantine());
      setPendingCount(getDirtyRows().length);
    };
    const evts = [
      "sync-errors-change", "sync-error", "sync-synced",
      "sync-quarantine-change", "localstore-change",
    ];
    for (const e of evts) window.addEventListener(e, refresh);
    return () => { for (const e of evts) window.removeEventListener(e, refresh); };
  }, []);

  const anything = errors.length + quarantine.length + pendingCount;
  if (anything === 0) return null;

  const handleRetry = async () => {
    setBusy("retry");
    try { await pushAll(); } finally {
      setBusy(null);
      setErrors(getSyncErrors());
      setPendingCount(getDirtyRows().length);
    }
  };

  const handleRepair = async () => {
    // §6.3 Repair ladder: purge SW REST caches → pull → push → surface remainder.
    setBusy("repair");
    try {
      await purgeSwRestCaches();
      await pullAll();
      await pushAll();
    } finally {
      setBusy(null);
      setErrors(getSyncErrors());
      setQuarantine(getQuarantine());
      setPendingCount(getDirtyRows().length);
    }
  };

  const handleDismissErrors = () => {
    clearSyncErrors();
  };

  const handleQuarantineRetry = (key: string) => {
    retryQuarantined(key);
    setQuarantine(getQuarantine());
    pushAll();
  };

  const handleQuarantineDiscard = (key: string) => {
    if (!window.confirm("Discard this change permanently? It will be lost.")) return;
    discardQuarantined(key);
    setQuarantine(getQuarantine());
  };

  const summary = [
    pendingCount > 0 ? `${pendingCount} pending` : null,
    errors.length > 0 ? `${errors.length} error${errors.length === 1 ? "" : "s"}` : null,
    quarantine.length > 0 ? `${quarantine.length} parked` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/20 transition-colors"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Sync needs attention — {summary}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync issues</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {pendingCount} local change{pendingCount === 1 ? " is" : "s are"} waiting to sync.
            </p>
          )}

          {errors.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent errors
              </h3>
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
                </div>
              ))}
            </section>
          )}

          {quarantine.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Parked changes ({quarantine.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                These changes were refused by the server. Retry after fixing the cause, or discard.
              </p>
              {quarantine.map((q) => (
                <div
                  key={q.key}
                  className="rounded-md border border-border bg-muted/30 p-2 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-muted-foreground">
                      {q.table} · {q.reason}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(q.quarantinedAt).toLocaleString()}
                    </span>
                  </div>
                  {q.error?.message && (
                    <p className="text-sm text-foreground/90 break-words">{q.error.message}</p>
                  )}
                  <div className="flex gap-1 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleQuarantineRetry(q.key)}
                    >
                      <RotateCw className="h-3 w-3" /> Retry
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleQuarantineDiscard(q.key)}
                    >
                      <Trash2 className="h-3 w-3" /> Discard
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleRetry}
              disabled={busy !== null}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy === "retry" ? "animate-spin" : ""}`} />
              Retry now
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDismissErrors}
              disabled={busy !== null || errors.length === 0}
            >
              Clear errors
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-1.5"
            onClick={handleRepair}
            disabled={busy !== null}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy === "repair" ? "animate-spin" : ""}`} />
            Repair synchronization
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Repair clears offline caches, pulls fresh data from the server, then retries everything queued.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncIssuesPanel;
