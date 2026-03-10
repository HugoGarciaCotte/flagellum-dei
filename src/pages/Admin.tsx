import { useNavigate } from "react-router-dom";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Download, Search } from "lucide-react";

import ManageScenarios from "@/components/ManageScenarios";
import ImportFeatsCard from "@/components/ImportFeatsCard";
import { Swords } from "lucide-react";
import ManageRedirects from "@/components/ManageRedirects";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";

const Admin = () => {
  const navigate = useNavigate();
  const { isOwner, isLoading: roleLoading } = useIsOwner();

  if (roleLoading) {
    return <FullPageLoader />;
  }

  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">Access denied.</p>
        <Button onClick={() => navigate("/")} variant="outline">Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Admin Panel"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <main className="container py-8 max-w-5xl space-y-6">
        {/* Scenarios Import — disabled (hardcoded in source) */}
        <Card className="border-primary/20 opacity-60">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Download className="h-5 w-5 text-muted-foreground" /> Import Scenarios from Wiki
            </CardTitle>
            <CardDescription>
              Scenarios are now hardcoded in the source code and ship with the app bundle.
              Wiki import is disabled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="gap-2 font-display">
              <Search className="h-4 w-4" /> Check for Updates
            </Button>
          </CardContent>
        </Card>

        <ManageScenarios />

        {/* Feats Import — disabled (hardcoded in source) */}
        <ImportFeatsCard />

        <Card className="border-primary/20 opacity-60">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Swords className="h-5 w-5 text-muted-foreground" /> Manage Feats
            </CardTitle>
            <CardDescription>
              Feats are hardcoded in the source code. Open the read-only viewer below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/feats")} variant="outline" className="gap-2 font-display">
              <Swords className="h-4 w-4" /> View Feats Library
            </Button>
          </CardContent>
        </Card>

        <ManageRedirects />
      </main>
    </div>
  );
};

export default Admin;
