import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Sword, Loader2, Search, X, Check, Upload } from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";

type PreviewItem = { title: string; status: "new" | "modified" | "unchanged"; categories?: string[]; diff?: { contentChanged: boolean; categoriesChanged: boolean; firstDiffAt: number; dbSnippet: string | null; wikiSnippet: string | null; dbLength: number; wikiLength: number } };
type PushPreviewItem = { title: string; id: string; status: string; error?: string };

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

const pushStatusBadge = (status: string) => {
  switch (status) {
    case "new":
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">New</Badge>;
    case "modified":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Modified</Badge>;
    case "delete":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Delete</Badge>;
    case "unchanged":
      return <Badge variant="outline" className="text-muted-foreground">Unchanged</Badge>;
    case "not_found":
      return <Badge variant="outline" className="text-muted-foreground">Not on Wiki</Badge>;
    case "error":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Error</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const ImportFeatsCard = () => {
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [result, setResult] = useState<{ imported: number; total: number; errors: string[] } | null>(null);

  // Push to Wiki state
  const [pushChecking, setPushChecking] = useState(false);
  const [pushPreview, setPushPreview] = useState<PushPreviewItem[] | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch all feat IDs for push preview
  const { data: allFeats } = useQuery({
    queryKey: ["admin-feats-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feats").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const handlePreview = async () => {
    setChecking(true);
    setPreview(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-wiki-feats", {
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
      const { data, error } = await supabase.functions.invoke("import-wiki-feats", {
        body: { mode: "execute" },
      });
      if (error) throw error;
      setResult(data);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-feats-ids"] });
      toast({
        title: "Import complete",
        description: `Imported ${data.imported} of ${data.total} feats.`,
      });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handlePushPreview = async () => {
    if (!allFeats?.length) return;
    setPushChecking(true);
    setPushPreview(null);
    try {
      // Send all feat IDs in batches
      const allResults: PushPreviewItem[] = [];
      const BATCH = 10;
      for (let i = 0; i < allFeats.length; i += BATCH) {
        const batch = allFeats.slice(i, i + BATCH);
        const { data, error } = await supabase.functions.invoke("push-wiki-feats", {
          body: { ids: batch.map(f => f.id), mode: "preview" },
        });
        if (error) throw error;
        allResults.push(...(data?.results || []));
      }
      setPushPreview(allResults);
    } catch (e: any) {
      toast({ title: "Push check failed", description: e.message, variant: "destructive" });
    } finally {
      setPushChecking(false);
    }
  };

  const handlePushExecute = async () => {
    if (!pushPreview) return;
    const toPush = pushPreview.filter(p => p.status !== "unchanged" && p.status !== "not_found" && p.status !== "error");
    if (toPush.length === 0) return;

    setPushing(true);
    setPushProgress({ current: 0, total: toPush.length });
    let errors = 0;

    const BATCH = 5;
    for (let i = 0; i < toPush.length; i += BATCH) {
      const batch = toPush.slice(i, i + BATCH);
      setPushProgress({ current: Math.min(i + BATCH, toPush.length), total: toPush.length });
      try {
        const { data, error } = await supabase.functions.invoke("push-wiki-feats", {
          body: { ids: batch.map(f => f.id) },
        });
        if (error) throw error;
        errors += (data?.results || []).filter((r: any) => r.status === "error").length;
      } catch {
        errors += batch.length;
      }
    }

    setPushing(false);
    setPushProgress(null);
    setPushPreview(null);
    toast({
      title: "Push complete",
      description: errors > 0 ? `${errors} feat(s) had errors.` : `All ${toPush.length} feats pushed.`,
    });
  };

  const newCount = preview?.filter((i) => i.status === "new").length ?? 0;
  const modifiedCount = preview?.filter((i) => i.status === "modified").length ?? 0;
  const unchangedCount = preview?.filter((i) => i.status === "unchanged").length ?? 0;
  const hasChanges = newCount + modifiedCount > 0;

  const pushChanges = pushPreview?.filter(p => p.status !== "unchanged" && p.status !== "not_found" && p.status !== "error").length ?? 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Sword className="h-5 w-5 text-primary" /> Import / Push Feats
        </CardTitle>
        <CardDescription>
          Sync feats between the wiki and the database. Import pulls content from prima.wiki. Push sends parseable fields back to the wiki.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* === IMPORT SECTION === */}
        {!preview && !result && !pushPreview && (
          <div className="flex items-center gap-3">
            <Button onClick={handlePreview} disabled={checking || pushChecking} className="gap-2 font-display">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {checking ? "Checking..." : "Check for Updates"}
            </Button>
            <Button onClick={handlePushPreview} disabled={pushChecking || checking || !allFeats?.length} variant="outline" className="gap-2 font-display">
              {pushChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {pushChecking ? "Checking..." : "Push to Wiki"}
            </Button>
          </div>
        )}

        {/* Import preview */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{preview.length} feats found</span>
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
                    <TableHead>Feat</TableHead>
                    <TableHead className="w-28 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((item) => (
                    <TableRow key={item.title}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.title}
                          <FeatCategoryBadges categories={item.categories} />
                        </div>
                        {item.diff && (
                          <div className="mt-1 text-xs text-muted-foreground space-y-0.5 font-mono">
                            <p>Diff at char {item.diff.firstDiffAt} | DB len: {item.diff.dbLength} | Wiki len: {item.diff.wikiLength}</p>
                            {item.diff.dbSnippet && <p className="text-destructive">DB: {item.diff.dbSnippet}</p>}
                            {item.diff.wikiSnippet && <p className="text-primary">Wiki: {item.diff.wikiSnippet}</p>}
                            <p>content: {item.diff.contentChanged ? "changed" : "same"} | categories: {item.diff.categoriesChanged ? "changed" : "same"}</p>
                          </div>
                        )}
                      </TableCell>
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

        {/* Push preview */}
        {pushPreview && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{pushPreview.length} feats checked</span>
              <span>·</span>
              <span className="text-emerald-400">{pushPreview.filter(p => p.status === "new").length} new</span>
              <span>·</span>
              <span className="text-amber-400">{pushPreview.filter(p => p.status === "modified").length} modified</span>
              <span>·</span>
              <span>{pushPreview.filter(p => p.status === "unchanged").length} unchanged</span>
            </div>

            {pushProgress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Pushing {pushProgress.current} of {pushProgress.total}...</span>
                  <span>{Math.round((pushProgress.current / pushProgress.total) * 100)}%</span>
                </div>
                <Progress value={(pushProgress.current / pushProgress.total) * 100} className="h-2" />
              </div>
            )}

            <div className="rounded-lg border border-border overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feat</TableHead>
                    <TableHead className="w-28 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pushPreview.filter(p => p.status !== "unchanged").map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="text-right">{pushStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                  {pushChanges === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">All parseable fields are up to date on the wiki.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-3">
              {pushChanges > 0 && (
                <Button onClick={handlePushExecute} disabled={pushing} className="gap-2 font-display">
                  {pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {pushing ? "Pushing..." : `Confirm Push (${pushChanges})`}
                </Button>
              )}
              <Button variant="outline" onClick={() => setPushPreview(null)} disabled={pushing} className="gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Import result */}
        {result && (
          <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
            <p className="text-foreground">
              Imported <strong>{result.imported}</strong> of <strong>{result.total}</strong> feats.
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
  );
};

export default ImportFeatsCard;
