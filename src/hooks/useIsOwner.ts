import { useAuth } from "@/contexts/AuthContext";
import { useLocalRows } from "@/hooks/useLocalData";

export function useIsOwner() {
  const { user, isGuest } = useAuth();
  const roles = useLocalRows("user_roles", { user_id: user?.id, role: "owner" });
  return { isOwner: isGuest ? false : roles.length > 0, isLoading: false };
}
