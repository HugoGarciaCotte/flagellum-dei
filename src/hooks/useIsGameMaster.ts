import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useIsGameMaster() {
  const { user } = useAuth();

  const { data: isGameMaster, isLoading } = useQuery({
    queryKey: ["user-role-game-master", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "game_master")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  return { isGameMaster: !!isGameMaster, isLoading };
}
