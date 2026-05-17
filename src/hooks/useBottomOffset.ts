import { useBottomStack } from "@/contexts/BottomStackContext";

/**
 * Returns the measured pixel height of all bottom-fixed banners (offline + guest).
 * Use this to position floating UI (dice roller, character bar, timers) above them.
 */
export function useBottomOffset() {
  return useBottomStack().bottomStackHeight;
}
