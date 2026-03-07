import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const GameTimer = () => {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

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
  if (!open) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => setOpen(true)}
          className="h-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-4"
          size="icon"
        >
          <Timer className="h-5 w-5" />
          <span className="font-display font-bold tabular-nums text-sm">
            {minutes}<span className="text-xs font-normal opacity-75 ml-0.5">m</span>
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 flex flex-col items-center gap-3 min-w-[140px]">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xs"
          aria-label="Close timer"
        >
          ✕
        </button>
        <p className="text-3xl font-display font-bold text-foreground tabular-nums">
          {minutes}:{seconds.toString().padStart(2, "0")} <span className="text-base font-normal text-muted-foreground">min</span>
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
    </div>
  );
};

export default GameTimer;
