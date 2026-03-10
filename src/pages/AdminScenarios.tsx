import { useNavigate } from "react-router-dom";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import ScenarioEditorPanel from "@/components/ScenarioEditorPanel";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";

const AdminScenarios = () => {
  const navigate = useNavigate();
  const { isOwner, isLoading } = useIsOwner();

  if (isLoading) return <FullPageLoader />;

  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">Access denied.</p>
        <Button onClick={() => navigate("/")} variant="outline">Return Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        title="Scenario Manager"
        icon={<FileText className="h-5 w-5 text-primary" />}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />
      <main className="container flex-1 overflow-hidden py-4 max-w-5xl flex flex-col">
        <ScenarioEditorPanel />
      </main>
    </div>
  );
};

export default AdminScenarios;
