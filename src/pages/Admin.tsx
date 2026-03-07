import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useIsOwner } from "@/hooks/useIsOwner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Crown, Download, Loader2, Search, X, Check } from "lucide-react";
import ManageScenarios from "@/components/ManageScenarios";
import ImportFeatsCard from "@/components/ImportFeatsCard";
import { Swords } from "lucide-react";
import ManageRedirects from "@/components/ManageRedirects";
import FullPageLoader from "@/components/FullPageLoader";
import PageHeader from "@/components/PageHeader";

type PreviewItem = { title: string; status: "new" | "modified" | "unchanged" };

const statusBadge = (status: PreviewItem["status"]) => {
  switch (status) {
    case "new":
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">New</Badge>;
    case "modified":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">Modified</Badge>;
    case "unchanged":
      return <Badge variant="outline" className="text-muted-foreground">Unchanged</Badge>;
  }
};

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOwner, isLoading: roleLoading } = useIsOwner();
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [result, setResult] = useState<{ imported: number; total: number; errors: string[] } | null>(null);

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

  const handlePreview = async () => {
    setChecking(true);
    setPreview(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-wiki-scenarios", {
        body: { mode: "preview" },
      });
      if (error) throw error;
      setPreview(data.items || []);
    } catch (e: any) {
      toast({ title: "Check failed", description: e.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);
      const { data, error } = await supabase.functions.invoke("import-wiki-scenarios", {
        body: { mode: "execute" },
      });
      clearTimeout(timeout);
      if (error) throw error;
      setResult(data);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-scenarios"] });
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

  const newCount = preview?.filter((i) => i.status === "new").length ?? 0;
  const modifiedCount = preview?.filter((i) => i.status === "modified").length ?? 0;
  const unchangedCount = preview?.filter((i) => i.status === "unchanged").length ?? 0;
  const hasChanges = newCount + modifiedCount > 0;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Admin Panel"
        icon={<Crown className="h-5 w-5 text-primary" />}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <main className="container py-8 max-w-5xl space-y-6">
        {/* Scenarios Import */}
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
            {!preview && !result && (
              <Button onClick={handlePreview} disabled={checking} className="gap-2 font-display">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {checking ? "Checking..." : "Check for Updates"}
              </Button>
            )}

            {preview && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{preview.length} scenarios found</span>
                  <span>·</span>
                  <span className="text-emerald-400">{newCount} new</span>
                  <span>·</span>
                  <span className="text-amber-400">{modifiedCount} modified</span>
                  <span>·</span>
                  <span>{unchangedCount} unchanged</span>
                </div>

                <div className="rounded-lg border border-border overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scenario</TableHead>
                        <TableHead className="w-28 text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((item) => (
                        <TableRow key={item.title}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell className="text-right">{statusBadge(item.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-3">
                  {hasChanges && (
                    <Button onClick={handleImport} disabled={importing} className="gap-2 font-display">
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {importing ? "Importing..." : `Confirm Import (${newCount + modifiedCount})`}
                    </Button>
                  )}
                  {!hasChanges && (
                    <p className="text-sm text-muted-foreground py-2">Everything is up to date.</p>
                  )}
                  <Button variant="outline" onClick={() => setPreview(null)} disabled={importing} className="gap-2">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            )}

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
                <Button variant="outline" size="sm" onClick={() => setResult(null)} className="mt-2">
                  Done
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <ManageScenarios />

        {/* Feats Import */}
        <ImportFeatsCard />

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" /> Manage Feats
            </CardTitle>
            <CardDescription>
              Create, edit, check with AI, and push feats to the wiki.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin/feats")} className="gap-2 font-display">
              <Swords className="h-4 w-4" /> Open Feat Manager
            </Button>
          </CardContent>
        </Card>

        <ManageRedirects />
      </main>
    </div>
  );
};

export default Admin;
