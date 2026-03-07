import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import FullPageLoader from "@/components/FullPageLoader";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) return <Home />;

  return <Dashboard />;
};

export default Index;
