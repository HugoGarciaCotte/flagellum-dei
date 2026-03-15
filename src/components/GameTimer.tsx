import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type { AmbianceEntry } from "@/lib/parseWikitext";

interface GameTimerProps {
  ambianceTrack?: AmbianceEntry[];
  position?: "left" | "right";
}

const GameTimer = ({ ambianceTrack }: GameTimerProps) => {
  const [open, setOpen] = useState(false);
  const [ambianceOpen, setAmbianceOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [newEvent, setNewEvent] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const prevAmbianceIdxRef = useRef<number>(-1);
  const { t } = useTranslation();

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
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
  const showTime = running && elapsed > 0;
  const hasAmbiance = ambianceTrack && ambianceTrack.length > 0;

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

  if (!open) {
    return (
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-1">
        <Button
          onClick={() => setOpen(true)}
          size={showTime ? undefined : "icon"}
          className={showTime
            ? "h-12 rounded-full shadow-lg px-4 gap-2"
            : "h-12 w-12 rounded-full shadow-lg"
          }
        >
          <Timer className="h-5 w-5 shrink-0" />
          {showTime && (
            <span className="font-display font-bold tabular-nums text-sm">
              {minutes}<span className="text-xs font-normal opacity-75 ml-0.5">m</span>
            </span>
          )}
        </Button>

        {hasAmbiance && (
          <>
            <button
              onClick={() => setAmbianceOpen(!ambianceOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-300 bg-amber-100 text-amber-900 text-xs shadow-sm transition-all",
                newEvent && "animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              )}
            >
              <span className="font-semibold shrink-0">{t("timer.ambiance")} :</span>
              {activeAmbianceIdx >= 0 && (
                <span className="truncate max-w-[150px]">
                  {ambianceTrack[activeAmbianceIdx].text}
                </span>
              )}
            </button>

            {ambianceOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAmbianceOpen(false)} />
                <div className="relative z-50 bg-card border border-border rounded-xl shadow-xl p-3 max-w-[340px] max-h-[50vh] overflow-y-auto">
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
              </>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className="fixed bottom-6 left-6 z-50">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4 flex flex-col items-center gap-3 min-w-[180px] relative">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xs"
            aria-label="Close timer"
          >
            ✕
          </button>

          <TimerControls
            minutes={minutes}
            seconds={seconds}
            running={running}
            setRunning={setRunning}
            reset={reset}
            t={t}
          />
        </div>
      </div>
    </>
  );
};

function TimerControls({
  minutes,
  seconds,
  running,
  setRunning,
  reset,
  t,
  compact,
}: {
  minutes: number;
  seconds: number;
  running: boolean;
  setRunning: (v: boolean) => void;
  reset: () => void;
  t: (k: string) => string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center", compact ? "gap-1" : "gap-3")}>
      <p className={cn("font-display font-bold text-foreground tabular-nums", compact ? "text-lg" : "text-3xl")}>
        {minutes}:{seconds.toString().padStart(2, "0")}{" "}
        <span className={cn("font-normal text-muted-foreground", compact ? "text-xs" : "text-base")}>{t("timer.min")}</span>
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
  );
}

export default GameTimer;
