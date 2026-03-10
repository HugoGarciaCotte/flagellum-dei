import { useAuth } from "@/contexts/AuthContext";
import { User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const GuestBanner = () => {
  const { isGuest } = useAuth();

  if (!isGuest) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-900/90 text-amber-100 text-center py-2 px-4 text-sm font-display flex items-center justify-center gap-2 backdrop-blur">
      <User className="h-4 w-4" />
      Guest mode — data saved locally only
      <Link
        to="/auth"
        onClick={() => {
          // Clear guest mode so Auth page shows login
          localStorage.removeItem("guest_mode");
        }}
        className="ml-2 inline-flex items-center gap-1 underline underline-offset-2 hover:text-amber-50 font-semibold"
      >
        Sign up to save online <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
};
