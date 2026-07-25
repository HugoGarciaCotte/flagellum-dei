import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { upsertRow } from "@/lib/localStore";
import { pullTable } from "@/lib/syncManager";
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
        const { data, error } = await supabase
          .rpc("join_game_by_code", { _code: (code || "").toUpperCase() });
        const game: any = Array.isArray(data) ? data[0] : data;

        if (error || !game) {
          toast({ title: t("dashboard.gameNotFound"), description: t("dashboard.checkCode"), variant: "destructive" });
          navigate("/", { replace: true });
          return;
        }

        upsertRow("games", game);
        // The RPC already inserted the game_players row server-side (with its own id).
        // Pull it into the local cache instead of inserting a phantom row with a new id,
        // which would violate the (game_id, user_id) unique constraint on push.
        await pullTable("game_players", { game_id: game.id, user_id: user.id });
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
