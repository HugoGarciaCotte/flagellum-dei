import { useState, useCallback, useEffect, useRef } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / duration);
      const click = Math.sin(t * 3000) * 0.3 + Math.sin(t * 1500) * 0.2;
      const noise = (Math.random() * 2 - 1) * 0.5;
      const bounce = Math.abs(Math.sin(t * 25)) * 0.6 + 0.4;
      data[i] = (click + noise) * envelope * bounce * 0.4;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    source.onended = () => ctx.close();
  } catch {
    // Audio not available
  }
}

interface DiceRollerProps {
  gameId?: string;
  userName?: string;
  isGameMaster?: boolean;
}

const DiceRoller = ({ gameId, userName, isGameMaster }: DiceRollerProps) => {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [displayValue, setDisplayValue] = useState(1);
  const [phase, setPhase] = useState<"idle" | "rolling" | "result">("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const finalValueRef = useRef(1);
  const rollIdRef = useRef("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to broadcast channel
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase.channel(`dice-${gameId}`);
    channel
      .on("broadcast", { event: "dice-roll" }, ({ payload }) => {
        // Skip own rolls
        if (payload.rollId === rollIdRef.current) return;

        if (payload.isGameMaster) {
          toast({ title: "🎲 The Game Master rolled a dice" });
        } else {
          toast({ title: `🎲 ${payload.userName} rolled a ${payload.result}` });
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gameId]);

  const broadcastRoll = useCallback(
    (value: number) => {
      if (!gameId || !channelRef.current) return;
      const rollId = crypto.randomUUID();
      rollIdRef.current = rollId;
      channelRef.current.send({
        type: "broadcast",
        event: "dice-roll",
        payload: { userName, result: value, isGameMaster, rollId },
      });
    },
    [gameId, userName, isGameMaster]
  );

  const showResult = useCallback(
    (value: number) => {
      clearInterval(intervalRef.current);
      clearTimeout(settleTimeoutRef.current);
      setResult(value);
      setDisplayValue(value);
      setPhase("result");

      broadcastRoll(value);

      dismissTimeoutRef.current = setTimeout(() => {
        setPhase("idle");
        setRolling(false);
      }, 1800);
    },
    [broadcastRoll]
  );

  const roll = useCallback(() => {
    if (rolling) return;

    playDiceSound();
    setRolling(true);
    setPhase("rolling");
    setResult(null);

    finalValueRef.current = Math.floor(Math.random() * 6) + 1;

    intervalRef.current = setInterval(() => {
      setDisplayValue((v) => (v % 6) + 1);
    }, 60);

    settleTimeoutRef.current = setTimeout(() => {
      showResult(finalValueRef.current);
    }, 1200);
  }, [rolling, showResult]);

  const handleOverlayClick = useCallback(() => {
    if (phase === "rolling") {
      showResult(finalValueRef.current);
    } else if (phase === "result") {
      clearTimeout(dismissTimeoutRef.current);
      setPhase("idle");
      setRolling(false);
    }
  }, [phase, showResult]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(settleTimeoutRef.current);
      clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <div className="fixed bottom-20 right-6 z-50">
        <Button
          onClick={roll}
          disabled={rolling}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Dices className="h-6 w-6" />
        </Button>
      </div>

      {phase !== "idle" && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm cursor-pointer"
          onClick={handleOverlayClick}
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

      <style>{`
        @keyframes dice-tumble {
          0%   { transform: translate(-150px, -200px) rotate(0deg) scale(0.3); opacity: 0; }
          10%  { opacity: 1; }
          20%  { transform: translate(120px, 150px) rotate(360deg) scale(1.1); }
          35%  { transform: translate(-100px, 80px) rotate(720deg) scale(0.9); }
          50%  { transform: translate(80px, -120px) rotate(1080deg) scale(1.05); }
          65%  { transform: translate(-60px, 60px) rotate(1300deg) scale(0.95); }
          80%  { transform: translate(30px, -30px) rotate(1400deg) scale(1.02); }
          100% { transform: translate(0, 0) rotate(1440deg) scale(1); opacity: 1; }
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
