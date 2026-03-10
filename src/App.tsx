import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { GuestBanner } from "@/components/GuestBanner";
import { attachOnlineListener } from "@/lib/offlineQueue";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import HostGame from "./pages/HostGame";
import PlayGame from "./pages/PlayGame";
import ResetPassword from "./pages/ResetPassword";
import Install from "./pages/Install";
import Admin from "./pages/Admin";
import AdminFeats from "./pages/AdminFeats";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error) => {
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
    },
  },
});

// Auto-sync offline queue when connectivity returns
attachOnlineListener(() => {
  queryClient.invalidateQueries();
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <OfflineBanner />
        <GuestBanner />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
