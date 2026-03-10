import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const GUEST_GM_KEY = "guest_is_game_master";

export function useIsGameMaster() {
  const { user, isGuest } = useAuth();

  const { data: isGameMaster, isLoading } = useQuery({
    queryKey: ["user-role-game-master", user?.id],
    queryFn: async () => {
      if (isGuest) {
        return localStorage.getItem(GUEST_GM_KEY) === "true";
      }
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

  const setGuestGameMaster = (value: boolean) => {
    localStorage.setItem(GUEST_GM_KEY, String(value));
  };

  return { isGameMaster: !!isGameMaster, isLoading, setGuestGameMaster };
}
