import { useState, useCallback, useEffect, useRef } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";

// Classic die dot patterns for faces 1-6
const DOT_PATTERNS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DieFace({ value, size = 96 }: { value: number; size?: number }) {
  const dotSize = size / 6;
  const positions = DOT_PATTERNS[value] || [];
  return (
    <div
      className="rounded-xl bg-background border-2 border-primary shadow-xl grid grid-cols-3 grid-rows-3 p-3"
      style={{ width: size, height: size }}
    >
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <div key={`${row}-${col}`} className="flex items-center justify-center">
            {positions.some(([r, c]) => r === row && c === col) && (
              <div
                className="rounded-full bg-primary"
                style={{ width: dotSize, height: dotSize }}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}

function playDiceSound() {
  try {
    const ctx = new AudioContext();
    const duration = 0.6;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Synthesize a rattling dice sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / duration);
      // Multiple clicking frequencies blended
      const click = Math.sin(t * 3000) * 0.3 + Math.sin(t * 1500) * 0.2;
      const noise = (Math.random() * 2 - 1) * 0.5;
      // Rapid "bouncing" modulation
      const bounce = Math.abs(Math.sin(t * 25)) * 0.6 + 0.4;
      data[i] = (click + noise) * envelope * bounce * 0.4;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    source.onended = () => ctx.close();
  } catch {
    // Audio not available, silently ignore
  }
}

const DiceRoller = () => {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [displayValue, setDisplayValue] = useState(1);
  const [phase, setPhase] = useState<"idle" | "rolling" | "result">("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const roll = useCallback(() => {
    if (rolling) return;

    playDiceSound();
    setRolling(true);
    setPhase("rolling");
    setResult(null);

    // Rapidly cycle displayed number
    intervalRef.current = setInterval(() => {
      setDisplayValue((v) => (v % 6) + 1);
    }, 60);

    // After 1.2s, settle on result
    setTimeout(() => {
      clearInterval(intervalRef.current);
      const finalValue = Math.floor(Math.random() * 6) + 1;
      setResult(finalValue);
      setDisplayValue(finalValue);
      setPhase("result");

      // Auto-dismiss after 1.8s
      setTimeout(() => {
        setPhase("idle");
        setRolling(false);
      }, 1800);
    }, 1200);
  }, [rolling]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <>
      {/* FAB Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={roll}
          disabled={rolling}
          className="h-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 px-5 gap-2"
        >
          <Dices className="h-6 w-6" />
          <span className="font-display text-sm">Click to roll a die</span>
        </Button>
      </div>

      {/* Full-screen overlay */}
      {phase !== "idle" && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm"
          style={{
            animation: phase === "result" ? "none" : undefined,
          }}
        >
          <div
            className="flex flex-col items-center gap-4"
            style={{
              animation:
                phase === "rolling"
                  ? "dice-tumble 1.2s ease-out forwards"
                  : "dice-settle 0.3s ease-out forwards",
            }}
          >
            <DieFace value={displayValue} size={120} />
            {phase === "result" && (
              <p className="text-2xl font-display font-bold text-primary animate-scale-in">
                You rolled a {result}!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes dice-tumble {
          0% { transform: rotate(0deg) scale(0.3); opacity: 0; }
          15% { opacity: 1; }
          25% { transform: rotate(360deg) scale(1.15); }
          50% { transform: rotate(720deg) scale(0.9); }
          75% { transform: rotate(1080deg) scale(1.05); }
          100% { transform: rotate(1440deg) scale(1); opacity: 1; }
        }
        @keyframes dice-settle {
          0% { transform: scale(1.1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
};

export default DiceRoller;
