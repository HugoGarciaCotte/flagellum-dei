import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Check, ExternalLink, Link2, Loader2, Search, Trash2, Pencil, X } from "lucide-react";

const WIKI_LINK_RE = /\[\[([^|\]]+?)(?:\|[^\]]+?)?\]\]/g;

function extractAllLinkTargets(feats: { content: string | null }[]): string[] {
  const targets = new Set<string>();
  for (const feat of feats) {
    if (!feat.content) continue;
    let match;
    const re = new RegExp(WIKI_LINK_RE.source, "g");
    while ((match = re.exec(feat.content)) !== null) {
      targets.add(match[1].trim());
    }
  }
  return Array.from(targets);
}

export default function ManageRedirects() {
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [wikiResults, setWikiResults] = useState<{ title: string; redirect_to: string | null; not_found: boolean }[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTo, setEditTo] = useState("");

  // Fetch all feats
  const { data: feats } = useQuery({
    queryKey: ["admin-feats-for-redirects"],
    queryFn: async () => {
      const { data } = await supabase.from("feats").select("title, content");
      return data ?? [];
    },
  });

  // Fetch existing redirects
  const { data: redirects } = useQuery({
    queryKey: ["feat-redirects"],
    queryFn: async () => {
      const { data } = await supabase.from("feat_redirects").select("*").order("from_title");
      return data ?? [];
    },
  });

  // Compute unmatched links
  const unmatchedLinks = useMemo(() => {
    if (!feats) return [];
    const featTitles = new Set(feats.map((f) => f.title.toLowerCase()));
    const redirectFroms = new Set((redirects ?? []).map((r) => r.from_title.toLowerCase()));
    const allTargets = extractAllLinkTargets(feats);
    return allTargets.filter(
      (t) => !featTitles.has(t.toLowerCase()) && !redirectFroms.has(t.toLowerCase())
    ).sort();
  }, [feats, redirects]);

  // Check wiki for redirects
  const handleCheckWiki = async () => {
    if (unmatchedLinks.length === 0) return;
    setChecking(true);
    setWikiResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-wiki-redirects", {
        body: { titles: unmatchedLinks },
      });
      if (error) throw error;
      setWikiResults(data.results ?? []);
    } catch (e: any) {
      toast({ title: "Check failed", description: e.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  // Import a single redirect
  const importMutation = useMutation({
    mutationFn: async ({ from_title, to_title }: { from_title: string; to_title: string }) => {
      const { error } = await supabase.from("feat_redirects").insert({ from_title, to_title });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feat-redirects"] });
      queryClient.invalidateQueries({ queryKey: ["feats-map-for-links"] });
    },
  });

  // Import all detected redirects at once
  const handleImportAll = async () => {
    if (!wikiResults) return;
    const toImport = wikiResults.filter((r) => r.redirect_to);
    let imported = 0;
    for (const r of toImport) {
      try {
        await importMutation.mutateAsync({ from_title: r.title, to_title: r.redirect_to! });
        imported++;
      } catch {}
    }
    toast({ title: `Imported ${imported} redirect(s)` });
    setWikiResults(null);
  };

  // Delete redirect
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feat_redirects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feat-redirects"] });
      queryClient.invalidateQueries({ queryKey: ["feats-map-for-links"] });
    },
  });

  // Update redirect
  const updateMutation = useMutation({
    mutationFn: async ({ id, to_title }: { id: string; to_title: string }) => {
      const { error } = await supabase.from("feat_redirects").update({ to_title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feat-redirects"] });
      queryClient.invalidateQueries({ queryKey: ["feats-map-for-links"] });
      setEditingId(null);
    },
  });

  const detectedRedirects = wikiResults?.filter((r) => r.redirect_to) ?? [];
  const notFound = wikiResults?.filter((r) => r.not_found) ?? [];
  const noRedirect = wikiResults?.filter((r) => !r.redirect_to && !r.not_found) ?? [];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" /> Manage Wiki Redirects
        </CardTitle>
        <CardDescription>
          Scan feat content for wiki links that don't match any feat. Detect redirects from the wiki and store them so tooltips resolve correctly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unmatched links summary */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{unmatchedLinks.length} unmatched link(s)</span>
          <span>·</span>
          <span>{(redirects ?? []).length} redirect(s) stored</span>
        </div>

        {/* Check wiki button */}
        {!wikiResults && (
          <Button onClick={handleCheckWiki} disabled={checking || unmatchedLinks.length === 0} className="gap-2 font-display">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {checking ? "Checking..." : "Check Wiki for Redirects"}
          </Button>
        )}

        {/* Wiki results */}
        {wikiResults && (
          <div className="space-y-4">
            {detectedRedirects.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{detectedRedirects.length} redirect(s) detected</p>
                  <Button size="sm" onClick={handleImportAll} className="gap-1 font-display">
                    <Check className="h-3.5 w-3.5" /> Import All
                  </Button>
                </div>
                <div className="rounded-lg border border-border overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From</TableHead>
                        <TableHead></TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectedRedirects.map((r) => (
                        <TableRow key={r.title}>
                          <TableCell className="font-medium text-sm">{r.title}</TableCell>
                          <TableCell><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                          <TableCell className="text-sm text-primary">{r.redirect_to}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                importMutation.mutate({ from_title: r.title, to_title: r.redirect_to! });
                                setWikiResults((prev) => prev?.filter((x) => x.title !== r.title) ?? null);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {notFound.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">{notFound.length} page(s) not found on wiki:</p>
                <p className="text-xs">{notFound.map((r) => r.title).join(", ")}</p>
              </div>
            )}

            {noRedirect.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">{noRedirect.length} page(s) exist but are not redirects:</p>
                <p className="text-xs">{noRedirect.map((r) => r.title).join(", ")}</p>
              </div>
            )}

            <Button variant="outline" onClick={() => setWikiResults(null)} className="gap-2">
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        )}

        {/* Existing redirects */}
        {(redirects ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Stored Redirects</p>
            <div className="rounded-lg border border-border overflow-hidden max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead></TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(redirects ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.from_title}</TableCell>
                      <TableCell><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                      <TableCell>
                        {editingId === r.id ? (
                          <div className="flex gap-1">
                            <Input
                              value={editTo}
                              onChange={(e) => setEditTo(e.target.value)}
                              className="h-7 text-sm"
                            />
                            <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: r.id, to_title: editTo })}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-primary">{r.to_title}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingId(r.id); setEditTo(r.to_title); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
