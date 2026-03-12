import { useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { LangRouter, LovalingoProvider } from "@lovalingo/lovalingo";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { GuestBanner } from "@/components/GuestBanner";
import { attachOnlineListener } from "@/lib/syncManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import HostGame from "./pages/HostGame";
import PlayGame from "./pages/PlayGame";
import ResetPassword from "./pages/ResetPassword";
import Install from "./pages/Install";
import Admin from "./pages/Admin";
import AdminFeats from "./pages/AdminFeats";
import AdminScenarios from "./pages/AdminScenarios";
import NotFound from "./pages/NotFound";

// Auto-sync when connectivity returns
attachOnlineListener();

const LOVALINGO_KEY = "aix_jtfkxaj4v7ceb6k8z9j4qd8rxmh75c2t";

const App = () => {
  const navigateRef = useRef<any>();

  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LangRouter
          publicAnonKey={LOVALINGO_KEY}
          defaultLang="en"
          langs={["en", "fr"]}
          navigateRef={navigateRef}
        >
          <LovalingoProvider
            publicAnonKey={LOVALINGO_KEY}
            defaultLocale="en"
            locales={["fr"]}
            routing="path"
            switcherPosition="bottom-right"
            switcherOffsetY={20}
            switcherTheme="dark"
            overlayBgColor="#141318"
            navigateRef={navigateRef}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/game/:gameId/host" element={<HostGame />} />
              <Route path="/game/:gameId/play" element={<PlayGame />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/install" element={<Install />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/feats" element={<AdminFeats />} />
              <Route path="/admin/scenarios" element={<AdminScenarios />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <OfflineBanner />
            <GuestBanner />
          </LovalingoProvider>
        </LangRouter>
      </TooltipProvider>
    </AuthProvider>
  );
};

export default App;
