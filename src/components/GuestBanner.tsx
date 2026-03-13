import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation";

export const GuestBanner = () => {
  const { isGuest } = useAuth();
  const online = useNetworkStatus();
  const { t } = useTranslation();

  if (!isGuest) return null;

  return (
    <div className={`fixed left-0 right-0 z-30 bg-amber-900/90 text-amber-100 text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur ${online ? "bottom-0" : "bottom-10"}`}>
      <User className="h-4 w-4" />
      {t("common.guestBanner")}
      <Link
        to="/auth"
        className="ml-2 inline-flex items-center gap-1 underline underline-offset-2 hover:text-amber-50 font-semibold"
      >
        {t("common.guestSignUp")} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
};
