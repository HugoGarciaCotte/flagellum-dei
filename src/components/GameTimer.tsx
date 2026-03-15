import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type { AmbianceEntry } from "@/lib/parseWikitext";

interface GameTimerProps {
  ambianceTrack?: AmbianceEntry[];
  position?: "left" | "right";
  hasActiveSection?: boolean;
}

const GameTimer = ({ ambianceTrack, position = "left", hasActiveSection = false }: GameTimerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [newEvent, setNewEvent] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const prevAmbianceIdxRef = useRef<number>(-1);
  const prevTrackRef = useRef<AmbianceEntry[] | undefined>();
  const { t } = useTranslation();

  const hasAmbiance = ambianceTrack && ambianceTrack.length > 0;

  useEffect(() => {
    if (ambianceTrack && ambianceTrack.length > 0 && prevTrackRef.current !== ambianceTrack) {
      setElapsed(0);
      setRunning(true);
      prevAmbianceIdxRef.current = -1;
    }
    prevTrackRef.current = ambianceTrack;
  }, [ambianceTrack]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const activeAmbianceIdx = hasAmbiance
    ? ambianceTrack.reduce<number>((best, entry, idx) => {
        if (entry.minutes <= minutes) return idx;
        return best;
      }, -1)
    : -1;

  useEffect(() => {
    if (activeAmbianceIdx >= 0 && activeAmbianceIdx !== prevAmbianceIdxRef.current) {
      setNewEvent(true);
      const timer = setTimeout(() => setNewEvent(false), 3000);
      prevAmbianceIdxRef.current = activeAmbianceIdx;
      return () => clearTimeout(timer);
    }
    prevAmbianceIdxRef.current = activeAmbianceIdx;
  }, [activeAmbianceIdx]);

  

  const posClass = position === "right" ? "right-6" : "left-6";

  // Current ambiance text for pill
  const getAmbianceText = () => {
    if (!hasActiveSection) return { text: t("timer.noSection"), muted: true };
    if (!hasAmbiance) return { text: t("timer.noAmbiance"), muted: true };
    if (!running && elapsed === 0) return { text: t("timer.startToBegin"), muted: true };
    if (!running && elapsed > 0) return { text: t("timer.paused"), muted: true };
    if (running && activeAmbianceIdx >= 0) return { text: ambianceTrack![activeAmbianceIdx].text, muted: false };
    return { text: "", muted: false };
  };
  const ambianceStatus = getAmbianceText();

  if (!expanded) {
    return (
      <div className={cn("fixed bottom-6 z-50", posClass)}>
        <button
          onClick={() => hasAmbiance && setExpanded(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs shadow-lg transition-all hover:shadow-xl",
            newEvent && "animate-pulse shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
          )}
        >
          <Timer className="h-4 w-4 shrink-0" />
          {running && elapsed > 0 && (
            <span className="font-display font-bold tabular-nums">{minutes}m</span>
          )}
          <span className="font-semibold shrink-0">{t("timer.ambiance")} :</span>
          {ambianceStatus.text && (
            <span className={cn("truncate max-w-[200px]", ambianceStatus.muted && "italic opacity-80")}>
              {ambianceStatus.text}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
      <div className={cn("fixed bottom-6 z-50", posClass)}>
        <div className="bg-card border border-border rounded-2xl shadow-xl flex flex-col min-w-[260px] max-w-[360px] max-h-[60vh] overflow-hidden">
          {/* Sticky header: timer controls */}
          <div className="shrink-0 bg-card border-b border-border p-4 flex flex-col items-center gap-2">
            <div className="w-full flex items-center justify-between">
              <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("timer.title")}
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="font-display font-bold text-foreground tabular-nums text-2xl">
              {minutes}:{seconds.toString().padStart(2, "0")}{" "}
              <span className="font-normal text-muted-foreground text-sm">{t("timer.min")}</span>
            </p>
            <div className="flex items-center gap-2">
              {running ? (
                <Button size="icon" variant="outline" onClick={() => setRunning(false)} className="h-9 w-9">
                  <Pause className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="icon" variant="outline" onClick={() => setRunning(true)} className="h-9 w-9">
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="outline" onClick={reset} className="h-9 w-9">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable ambiance table */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2">
              <Table>
                <TableBody>
                  {ambianceTrack.map((entry, idx) => (
                    <TableRow
                      key={idx}
                      className={cn(
                        "transition-colors",
                        idx === activeAmbianceIdx && "bg-primary/15 font-medium"
                      )}
                    >
                      <TableCell className="py-1.5 px-2 text-xs tabular-nums whitespace-nowrap w-12 align-top text-muted-foreground">
                        {entry.minutes}m
                      </TableCell>
                      <TableCell className="py-1.5 px-2 text-xs leading-relaxed">
                        {entry.text}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

export default GameTimer;
