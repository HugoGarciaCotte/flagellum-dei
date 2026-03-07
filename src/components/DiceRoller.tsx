import { useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DICE = [
  { sides: 4, label: "d4" },
  { sides: 6, label: "d6" },
  { sides: 8, label: "d8" },
  { sides: 10, label: "d10" },
  { sides: 12, label: "d12" },
  { sides: 20, label: "d20" },
  { sides: 100, label: "d100" },
];

const DiceRoller = () => {
  const [result, setResult] = useState<{ label: string; value: number } | null>(null);
  const [rolling, setRolling] = useState(false);

  const roll = (sides: number, label: string) => {
    setRolling(true);
    setResult(null);
    setTimeout(() => {
      const value = Math.floor(Math.random() * sides) + 1;
      setResult({ label, value });
      setRolling(false);
    }, 400);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Dices className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-56 p-3">
          <p className="text-sm font-medium text-foreground mb-2">Roll a die</p>
          <div className="grid grid-cols-4 gap-2">
            {DICE.map((d) => (
              <Button
                key={d.sides}
                variant="outline"
                size="sm"
                className="text-xs font-mono"
                onClick={() => roll(d.sides, d.label)}
                disabled={rolling}
              >
                {d.label}
              </Button>
            ))}
          </div>
          {rolling && (
            <div className="mt-3 text-center text-muted-foreground text-sm animate-pulse">
              Rolling...
            </div>
          )}
          {result && !rolling && (
            <div className="mt-3 text-center">
              <span className="text-xs text-muted-foreground">{result.label} →</span>
              <span className="ml-2 text-2xl font-bold text-primary font-mono">{result.value}</span>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DiceRoller;
