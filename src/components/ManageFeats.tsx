import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Sword, Loader2, Sparkles, Layers,
  ChevronDown, CheckCircle2, AlertCircle, Wand2, Unlock, Eye, ShieldCheck, Ban, Upload,
} from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import { parseEmbeddedFeatMeta, generateParseableBlock, type SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";
import { Badge } from "@/components/ui/badge";

type Feat = {
  id: string;
  title: string;
  content: string | null;
  categories: string[] | null;
  created_at: string;
};

type FormData = {
  title: string;
  content: string;
};

type AISuggestion = {
  field: string;
  current: string | null;
  suggested: string | null;
  action: "add" | "modify" | "delete";
  reason?: string;
};

type AICheckResult = {
  title: string;
  id: string;
  suggestions: AISuggestion[];
};

const emptyForm: FormData = { title: "", content: "" };

const ManageFeats = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Feat | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [pushPreviewFeat, setPushPreviewFeat] = useState<Feat | null>(null);
  const [pushPreviewStatus, setPushPreviewStatus] = useState<string | null>(null);
  const [pushConfirming, setPushConfirming] = useState(false);
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Check with AI state
  const [aiChecking, setAiChecking] = useState(false);
  const [aiCheckProgress, setAiCheckProgress] = useState<{ current: number; total: number } | null>(null);
  const [aiCheckResults, setAiCheckResults] = useState<AICheckResult[] | null>(null);
  const [aiCheckDialogOpen, setAiCheckDialogOpen] = useState(false);
  const [selectedForRegen, setSelectedForRegen] = useState<Set<string>>(new Set());
  const [regenFromCheck, setRegenFromCheck] = useState(false);
  const [regenFromCheckProgress, setRegenFromCheckProgress] = useState<{ current: number; total: number } | null>(null);

  const { data: feats, isLoading } = useQuery({
    queryKey: ["admin-feats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feats")
        .select("*")
        .order("title");
      if (error) throw error;
      return data as unknown as Feat[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData & { id?: string }) => {
      const payload = {
        title: formData.title,
        content: formData.content || null,
      };
      if (formData.id) {
        const { error } = await supabase.from("feats").update(payload).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("feats").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Feat updated" : "Feat created" });
    },
    onError: (e: any) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
      setDeleteTarget(null);
      toast({ title: "Feat deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    },
  });

  // Regenerate AI for a single feat — wipe + regen all fields
  const handleRegenerateAll = async (id: string) => {
    setRegeneratingId(id);
    try {
      const { error } = await supabase.functions.invoke("regenerate-description", {
        body: { action: "regenerate_all", id },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
      toast({ title: "AI content regenerated" });
    } catch (e: any) {
      toast({ title: "Regeneration failed", description: e.message, variant: "destructive" });
    } finally {
      setRegeneratingId(null);
    }
  };

  // Bulk regenerate all feats
  const handleBulkRegenerate = async () => {
    if (!feats?.length) return;
    setBulkRegenerating(true);
    setBulkProgress({ current: 0, total: feats.length });
    let errors = 0;
    for (let i = 0; i < feats.length; i++) {
      setBulkProgress({ current: i + 1, total: feats.length });
      try {
        const { error } = await supabase.functions.invoke("regenerate-description", {
          body: { action: "regenerate_all", id: feats[i].id },
        });
        if (error) throw error;
      } catch {
        errors++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
    setBulkRegenerating(false);
    setBulkProgress(null);
    toast({
      title: "Bulk regeneration complete",
      description: errors > 0 ? `${errors} feat(s) had errors.` : `All ${feats.length} feats processed.`,
    });
  };

  // Check all with AI
  const handleCheckWithAI = async () => {
    if (!feats?.length) return;
    setAiChecking(true);
    setAiCheckProgress({ current: 0, total: feats.length });
    try {
      const { data, error } = await supabase.functions.invoke("check-feats-ai", {
        body: { all: true },
      });
      if (error) throw error;
      setAiCheckResults(data?.results || []);
      setAiCheckProgress(null);
      setSelectedForRegen(new Set((data?.results || []).map((r: AICheckResult) => r.id)));
      setAiCheckDialogOpen(true);
    } catch (e: any) {
      toast({ title: "AI check failed", description: e.message, variant: "destructive" });
    } finally {
      setAiChecking(false);
      setAiCheckProgress(null);
    }
  };

  // Regenerate selected feats from AI check results
  const handleRegenSelected = async () => {
    if (selectedForRegen.size === 0) return;
    setRegenFromCheck(true);
    const ids = Array.from(selectedForRegen);
    setRegenFromCheckProgress({ current: 0, total: ids.length });
    let errors = 0;
    for (let i = 0; i < ids.length; i++) {
      setRegenFromCheckProgress({ current: i + 1, total: ids.length });
      try {
        const { error } = await supabase.functions.invoke("regenerate-description", {
          body: { action: "regenerate_all", id: ids[i] },
        });
        if (error) throw error;
      } catch {
        errors++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
    setRegenFromCheck(false);
    setRegenFromCheckProgress(null);
    setAiCheckDialogOpen(false);
    setAiCheckResults(null);
    toast({
      title: "Regeneration complete",
      description: errors > 0 ? `${errors} feat(s) had errors.` : `All ${ids.length} feats regenerated.`,
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (f: Feat) => {
    setEditingId(f.id);
    setForm({ title: f.title, content: f.content || "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ ...form, id: editingId ?? undefined });
  };

  const getMeta = (f: Feat) => parseEmbeddedFeatMeta(f.content);
  const hasDescription = (f: Feat) => !!getMeta(f).description?.trim();
  const hasSubfeats = (f: Feat) => { const m = getMeta(f); return Array.isArray(m.subfeats) && m.subfeats.length > 0; };
  const hasSpecialities = (f: Feat) => { const m = getMeta(f); return Array.isArray(m.specialities) && m.specialities.length > 0; };
  const hasUnlocks = (f: Feat) => { const m = getMeta(f); return Array.isArray(m.unlocks_categories) && m.unlocks_categories.length > 0; };
  const hasPrerequisites = (f: Feat) => !!getMeta(f).prerequisites?.trim();
  const hasBlocking = (f: Feat) => { const m = getMeta(f); return Array.isArray(m.blocking) && m.blocking.length > 0; };

  const StatusIcon = ({ ok, label, icon: Icon }: { ok: boolean; label: string; icon?: React.ComponentType<{ className?: string }> }) => (
    <span className="inline-flex items-center gap-1 text-xs" title={label}>
      {Icon ? (
        <Icon className={`h-3.5 w-3.5 ${ok ? "text-emerald-500" : "text-amber-500"}`} />
      ) : ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
      )}
      <span className={ok ? "text-emerald-500" : "text-amber-500"}>{label}</span>
    </span>
  );

  const renderSubfeatsDetail = (subfeats: SubfeatSlot[] | null) => {
    if (!subfeats || subfeats.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Subfeats:</p>
        {subfeats.map((s) => (
          <div key={s.slot} className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">
            <span className="font-medium">Slot {s.slot}</span>
            {" — "}
            {s.kind === "fixed" && <span>Fixed: {s.feat_title}</span>}
            {s.kind === "list" && <span>List: [{s.options?.join(", ")}]{s.optional ? " (optional)" : ""}</span>}
            {s.kind === "type" && <span>Type filter: {s.filter}{s.optional ? " (optional)" : ""}</span>}
          </div>
        ))}
      </div>
    );
  };


  const handlePushToWiki = async (f: Feat) => {
    setPushingId(f.id);
    try {
      const { data, error } = await supabase.functions.invoke("push-wiki-feats", {
        body: { id: f.id, mode: "preview" },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (!result) throw new Error("No result returned");
      if (result.status === "error") throw new Error(result.error || "Preview failed");
      if (result.status === "not_found") {
        toast({ title: "Not found", description: `${f.title} does not exist on the wiki.`, variant: "destructive" });
      } else if (result.status === "unchanged") {
        toast({ title: "Already up to date", description: `${f.title} is already in sync with the wiki.` });
      } else {
        setPushPreviewFeat(f);
        setPushPreviewStatus(result.status);
      }
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    } finally {
      setPushingId(null);
    }
  };

  const handleConfirmPush = async () => {
    if (!pushPreviewFeat) return;
    setPushConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("push-wiki-feats", {
        body: { id: pushPreviewFeat.id, mode: "execute" },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (!result) throw new Error("No result returned");
      if (result.status === "error") throw new Error(result.error || "Push failed");
      if (result.status === "unchanged") {
        toast({ title: "Already up to date", description: `${pushPreviewFeat.title} is already in sync.` });
      } else {
        toast({ title: "Pushed to wiki", description: `${pushPreviewFeat.title} updated on wiki.` });
      }
    } catch (e: any) {
      toast({ title: "Push failed", description: e.message, variant: "destructive" });
    } finally {
      setPushConfirming(false);
      setPushPreviewFeat(null);
      setPushPreviewStatus(null);
    }
  };

  const actionBadge = (action: string) => {
    switch (action) {
      case "add": return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Add</Badge>;
      case "modify": return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Modify</Badge>;
      case "delete": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Delete</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Sword className="h-5 w-5 text-primary" /> Manage Feats
              </CardTitle>
              <CardDescription className="mt-1.5">
                Create, edit, or delete feats. Content uses raw MediaWiki markup.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCheckWithAI}
                size="sm"
                variant="outline"
                className="gap-2 font-display"
                disabled={aiChecking || bulkRegenerating || !feats?.length}
              >
                {aiChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Check with AI
              </Button>
              <Button
                onClick={handleBulkRegenerate}
                size="sm"
                variant="outline"
                className="gap-2 font-display"
                disabled={bulkRegenerating || aiChecking || !feats?.length}
              >
                {bulkRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Regenerate All AI
              </Button>
              <Button onClick={openCreate} size="sm" className="gap-2 font-display">
                <Plus className="h-4 w-4" /> New
              </Button>
            </div>
          </div>
          {bulkProgress && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Processing feat {bulkProgress.current} of {bulkProgress.total}...</span>
                <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
              </div>
              <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !feats?.length ? (
            <p className="text-sm text-muted-foreground py-4">No feats yet.</p>
          ) : (
            <div className="space-y-1 max-h-[36rem] overflow-y-auto pr-1">
              {feats.map((f) => {
                const isExpanded = expandedId === f.id;
                const isRegenerating = regeneratingId === f.id;
                const meta = getMeta(f);
                return (
                  <Collapsible
                    key={f.id}
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedId(open ? f.id : null)}
                  >
                    <div className="rounded-lg border border-border hover:border-primary/30 transition-colors">
                      <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-3 flex items-start gap-3 cursor-pointer">
                          <ChevronDown
                            className={`h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{f.title}</span>
                              <FeatCategoryBadges categories={f.categories} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {meta.description || <span className="italic">No description</span>}
                            </p>
                            {(hasSubfeats(f) || hasSpecialities(f) || hasUnlocks(f) || hasPrerequisites(f) || hasBlocking(f)) && (
                              <div className="flex items-center gap-3 mt-1.5">
                                {hasPrerequisites(f) && <StatusIcon ok={true} label="Prerequisites" icon={ShieldCheck} />}
                                {hasBlocking(f) && <StatusIcon ok={true} label="Blocking" icon={Ban} />}
                                {hasSubfeats(f) && <StatusIcon ok={true} label="Subfeats" icon={Layers} />}
                                {hasSpecialities(f) && <StatusIcon ok={true} label="Specialities" icon={Sparkles} />}
                                {hasUnlocks(f) && <StatusIcon ok={true} label="Unlocks" icon={Unlock} />}
                              </div>
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 border-t border-border space-y-3">
                          <div className="pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                            <p className="text-sm text-foreground">
                              {meta.description || <span className="italic text-muted-foreground">None</span>}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Prerequisites</p>
                            <p className="text-sm text-foreground">
                              {meta.prerequisites || <span className="italic text-muted-foreground">None</span>}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Blocking Feats</p>
                            {hasBlocking(f) ? (
                              <p className="text-xs text-foreground">{meta.blocking!.join(", ")}</p>
                            ) : (
                              <p className="text-xs italic text-muted-foreground">None</p>
                            )}
                          </div>

                          {renderSubfeatsDetail(meta.subfeats)}
                          {!hasSubfeats(f) && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Subfeats</p>
                              <p className="text-xs italic text-muted-foreground">None configured</p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Specialities</p>
                            {hasSpecialities(f) ? (
                              <p className="text-xs text-foreground">{meta.specialities!.join(", ")}</p>
                            ) : (
                              <p className="text-xs italic text-muted-foreground">None detected</p>
                            )}
                          </div>

                          {f.content && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Content</p>
                              <pre className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 max-h-96 overflow-y-auto whitespace-pre-wrap">
                                {f.content}
                              </pre>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={(e) => { e.stopPropagation(); handleRegenerateAll(f.id); }}
                              disabled={isRegenerating}
                            >
                              {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                              Regenerate AI
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={(e) => { e.stopPropagation(); handlePushToWiki(f); }}
                              disabled={pushingId === f.id}
                            >
                              {pushingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                              Push to Wiki
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={(e) => { e.stopPropagation(); openEdit(f); }}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(f); }}>
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? "Edit Feat" : "Create Feat"}
            </DialogTitle>
            <DialogDescription>
              {editingId ? "Update the feat details below." : "Fill in the details for the new feat."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="feat-title">Title</Label>
              <Input
                id="feat-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Feat title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feat-content">Content (MediaWiki markup)</Label>
              <Textarea
                id="feat-content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="== Section ==&#10;Content here...&#10;&#10;<!--@ feat_one_liner: Short description @-->"
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            {editingId && (() => {
              const feat = feats?.find(f => f.id === editingId);
              if (!feat) return null;
              const meta = getMeta(feat);
              return renderSubfeatsDetail(meta.subfeats);
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 font-display">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save Changes" : "Create Feat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this feat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Check Results Dialog */}
      <Dialog open={aiCheckDialogOpen} onOpenChange={(open) => { if (!open && !regenFromCheck) { setAiCheckDialogOpen(false); setAiCheckResults(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> AI Review Results
            </DialogTitle>
            <DialogDescription>
              {aiCheckResults?.length
                ? `${aiCheckResults.length} feat(s) have suggested changes. Select which to regenerate.`
                : "All feats look good — no suggestions."}
            </DialogDescription>
          </DialogHeader>

          {regenFromCheckProgress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Regenerating {regenFromCheckProgress.current} of {regenFromCheckProgress.total}...</span>
                <span>{Math.round((regenFromCheckProgress.current / regenFromCheckProgress.total) * 100)}%</span>
              </div>
              <Progress value={(regenFromCheckProgress.current / regenFromCheckProgress.total) * 100} className="h-2" />
            </div>
          )}

          {aiCheckResults && aiCheckResults.length > 0 && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {aiCheckResults.map((result) => (
                <div key={result.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedForRegen.has(result.id)}
                      onCheckedChange={(checked) => {
                        setSelectedForRegen(prev => {
                          const next = new Set(prev);
                          if (checked) next.add(result.id);
                          else next.delete(result.id);
                          return next;
                        });
                      }}
                    />
                    <span className="font-medium text-sm">{result.title}</span>
                  </div>
                  <div className="pl-7 space-y-1.5">
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {actionBadge(s.action)}
                        <span className="font-medium text-muted-foreground">{s.field}</span>
                        {s.reason && <span className="text-muted-foreground">— {s.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAiCheckDialogOpen(false); setAiCheckResults(null); }} disabled={regenFromCheck}>
              Close
            </Button>
            {aiCheckResults && aiCheckResults.length > 0 && (
              <Button onClick={handleRegenSelected} disabled={regenFromCheck || selectedForRegen.size === 0} className="gap-2 font-display">
                {regenFromCheck ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Regenerate Selected ({selectedForRegen.size})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManageFeats;
