import { useAuth } from "@/contexts/AuthContext";
import { useLocalRows } from "@/hooks/useLocalData";

export function useIsOwner() {
  const { user, isGuest, syncReady } = useAuth();
  const roles = useLocalRows("user_roles", { user_id: user?.id, role: "owner" });
  return {
    isOwner: isGuest ? false : roles.length > 0,
    // Stay in loading state until the initial sync has populated user_roles,
    // otherwise the Admin page flashes "Access denied" right after sign-in.
    isLoading: !syncReady,
  };
}
