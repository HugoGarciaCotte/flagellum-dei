import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { upsertRow } from "@/lib/localStore";
import { triggerPush } from "@/lib/syncManager";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/useTranslation";
import FullPageLoader from "@/components/FullPageLoader";

const JoinGame = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading, syncReady } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const joining = useRef(false);

  useEffect(() => {
    if (loading) return;

    // Not logged in → redirect to auth with return URL
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/join/${code}`)}`, { replace: true });
      return;
    }

    if (!syncReady) return;
    if (joining.current) return;
    joining.current = true;

    const joinGame = async () => {
      try {
        const { data: game, error } = await supabase
          .from("games")
          .select("*")
          .eq("join_code", (code || "").toUpperCase())
          .eq("status", "active")
          .single();

        if (error || !game) {
          toast({ title: t("dashboard.gameNotFound"), description: t("dashboard.checkCode"), variant: "destructive" });
          navigate("/", { replace: true });
          return;
        }

        const { error: joinError } = await supabase
          .from("game_players")
          .insert({ game_id: game.id, user_id: user.id });

        if (joinError && !joinError.message.includes("duplicate")) {
          toast({ title: t("dashboard.errorJoining"), description: joinError.message, variant: "destructive" });
          navigate("/", { replace: true });
          return;
        }

        upsertRow("games", game);
        upsertRow("game_players", {
          id: crypto.randomUUID(),
          game_id: game.id,
          user_id: user.id,
          character_id: null,
          joined_at: new Date().toISOString(),
        });
        triggerPush();
        navigate(`/game/${game.id}/play`, { replace: true });
      } catch {
        toast({ title: t("dashboard.serverUnreachable"), description: t("dashboard.needOnlineToJoin"), variant: "destructive" });
        navigate("/", { replace: true });
      }
    };

    joinGame();
  }, [loading, user, syncReady, code, navigate, t]);

  return <FullPageLoader message={t("game.joiningQuest")} />;
};

export default JoinGame;
