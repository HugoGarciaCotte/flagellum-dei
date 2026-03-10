import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineQuery } from "@/hooks/useOfflineQuery";

export function useIsOwner() {
  const { user, isGuest } = useAuth();

  const { data: isOwner, isLoading } = useOfflineQuery<boolean>("qs_is_owner", {
    queryKey: ["user-role-owner", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "owner")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !isGuest,
  });

  return { isOwner: isGuest ? false : !!isOwner, isLoading };
}
