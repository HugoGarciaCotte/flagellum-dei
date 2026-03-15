import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const BANNER_HEIGHT = 40;

export function useBottomOffset() {
  const { isGuest } = useAuth();
  const online = useNetworkStatus();

  let offset = 0;
  if (!online) offset += BANNER_HEIGHT;
  if (isGuest) offset += BANNER_HEIGHT;
  return offset;
}
