import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation";
import { useEffect, useRef } from "react";
import { useBottomStack } from "@/contexts/BottomStackContext";

export const GuestBanner = () => {
  const { isGuest } = useAuth();
  const online = useNetworkStatus();
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { registerBottomLayer } = useBottomStack();

  useEffect(() => {
    if (!isGuest) {
      registerBottomLayer("guest-banner", null);
      return;
    }
    registerBottomLayer("guest-banner", ref.current);
    return () => registerBottomLayer("guest-banner", null);
  }, [isGuest, registerBottomLayer]);

  if (!isGuest) return null;

  // When online, this banner is the bottom-most layer → it must respect the OS safe area.
  // When offline, the OfflineBanner sits below it and handles the safe-area padding.
  const isBottomMost = online;

  return (
    <div
      ref={ref}
      className="fixed left-0 right-0 z-30 bg-amber-900/90 text-amber-100 text-center py-2 px-4 text-base font-display flex items-center justify-center gap-2 backdrop-blur bottom-0"
      style={
        isBottomMost
          ? { paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom))` }
          : undefined
      }
    >
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
