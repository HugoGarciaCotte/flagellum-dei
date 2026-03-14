import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/i18n/I18nContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { GuestBanner } from "@/components/GuestBanner";
import LanguagePicker from "@/components/LanguagePicker";
import { attachOnlineListener } from "@/lib/syncManager";
import { loadFeatOverrides } from "@/lib/featOverrides";
import { loadScenarioOverrides } from "@/lib/scenarioOverrides";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import HostGame from "./pages/HostGame";
import PlayGame from "./pages/PlayGame";
import ResetPassword from "./pages/ResetPassword";
import Install from "./pages/Install";
import Admin from "./pages/Admin";
import AdminFeats from "./pages/AdminFeats";
import AdminScenarios from "./pages/AdminScenarios";
import AdminTranslations from "./pages/AdminTranslations";
import NotFound from "./pages/NotFound";

// Auto-sync when connectivity returns
attachOnlineListener();
// Pre-load feat overrides (non-blocking)
loadFeatOverrides().catch(() => {});

const App = () => (
  <AuthProvider>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/admin/translations" element={<AdminTranslations />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <OfflineBanner />
          <GuestBanner />
          <LanguagePicker />
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </AuthProvider>
);

export default App;
