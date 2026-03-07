import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse-glow text-primary font-display text-2xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <Home />;

  return <Dashboard />;
};

export default Index;
