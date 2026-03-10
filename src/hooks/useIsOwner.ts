import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useIsOwner() {
  const { user, isGuest } = useAuth();

  const { data: isOwner, isLoading } = useQuery({
    queryKey: ["user-role-owner", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
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
