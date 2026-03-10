import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalRows } from "@/hooks/useLocalData";

const GUEST_GM_KEY = "guest_is_game_master";

export function useIsGameMaster() {
  const { user, isGuest } = useAuth();
  const [guestGm, setGuestGm] = useState(() => localStorage.getItem(GUEST_GM_KEY) === "true");

  const roles = useLocalRows("user_roles", { user_id: user?.id, role: "game_master" });

  const setGuestGameMaster = (value: boolean) => {
    localStorage.setItem(GUEST_GM_KEY, String(value));
    setGuestGm(value);
  };

  if (isGuest) {
    return { isGameMaster: guestGm, isLoading: false, setGuestGameMaster };
  }

  return { isGameMaster: roles.length > 0, isLoading: false, setGuestGameMaster };
}
