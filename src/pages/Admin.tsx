import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsOwner } from "@/hooks/useIsOwner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Crown, Download, Loader2 } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner, isLoading: roleLoading } = useIsOwner();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number; errors: string[] } | null>(null);

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse-glow text-primary font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="font-display text-xl text-muted-foreground">Access denied.</p>
        <Button onClick={() => navigate("/")} variant="outline">Return Home</Button>
      </div>
    );
  }

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-wiki-scenarios");
      if (error) throw error;
      setResult(data);
      toast({
        title: "Import complete",
        description: `Imported ${data.imported} of ${data.total} scenarios.`,
      });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center h-16 gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-xl font-bold text-primary flex items-center gap-2">
            <Crown className="h-5 w-5" /> Admin Panel
          </h1>
        </div>
      </header>

      <main className="container py-8 max-w-2xl space-y-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" /> Import Scenarios from Wiki
            </CardTitle>
            <CardDescription>
              Fetches all pages in the Scenario category from prima.wiki and imports their MediaWiki content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleImport} disabled={importing} className="gap-2 font-display">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {importing ? "Importing..." : "Import Scenarios"}
            </Button>

            {result && (
              <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
                <p className="text-foreground">
                  Imported <strong>{result.imported}</strong> of <strong>{result.total}</strong> scenarios.
                </p>
                {result.errors && result.errors.length > 0 && (
                  <div className="text-destructive space-y-1">
                    <p className="font-semibold">Errors:</p>
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
