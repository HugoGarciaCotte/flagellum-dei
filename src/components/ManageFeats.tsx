import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  ChevronDown, CheckCircle2, AlertCircle, Wand2, Copy,
} from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";

type SubfeatSlot = {
  slot: number;
  kind: "fixed" | "list" | "type";
  feat_title?: string;
  options?: string[];
  filter?: string;
  optional?: boolean;
};

type Feat = {
  id: string;
  title: string;
  content: string | null;
  description: string | null;
  categories: string[] | null;
  subfeats: SubfeatSlot[] | null;
  specialities: string[] | null;
  created_at: string;
};

type FormData = {
  title: string;
  description: string;
  content: string;
};

const emptyForm: FormData = { title: "", description: "", content: "" };

const ManageFeats = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Feat | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

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
        description: formData.description || null,
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

  const handleRegenerateAll = async (id: string) => {
    setRegeneratingId(id);
    try {
      await supabase.functions.invoke("regenerate-description", {
        body: { type: "feat", id },
      });
      await supabase.functions.invoke("regenerate-description", {
        body: { action: "regenerate_subfeats", id },
      });
      await supabase.functions.invoke("regenerate-description", {
        body: { action: "regenerate_specialities", id },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
      toast({ title: "AI content regenerated" });
    } catch (e: any) {
      toast({ title: "Regeneration failed", description: e.message, variant: "destructive" });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleBulkRegenerate = async () => {
    if (!feats?.length) return;
    setBulkRegenerating(true);
    setBulkProgress({ current: 0, total: feats.length });
    let errors = 0;
    for (let i = 0; i < feats.length; i++) {
      setBulkProgress({ current: i + 1, total: feats.length });
      try {
        await supabase.functions.invoke("regenerate-description", {
          body: { type: "feat", id: feats[i].id },
        });
        await supabase.functions.invoke("regenerate-description", {
          body: { action: "regenerate_subfeats", id: feats[i].id },
        });
        await supabase.functions.invoke("regenerate-description", {
          body: { action: "regenerate_specialities", id: feats[i].id },
        });
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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (f: Feat) => {
    setEditingId(f.id);
    setForm({ title: f.title, description: f.description || "", content: f.content || "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ ...form, id: editingId ?? undefined });
  };

  const hasDescription = (f: Feat) => !!f.description?.trim();
  const hasContent = (f: Feat) => !!f.content?.trim();
  const hasSubfeats = (f: Feat) => Array.isArray(f.subfeats) && f.subfeats.length > 0;
  const hasSpecialities = (f: Feat) => Array.isArray(f.specialities) && f.specialities.length > 0;

  const StatusIcon = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className="inline-flex items-center gap-1 text-xs" title={label}>
      {ok ? (
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

  const generateWikiTags = (f: Feat): string => {
    const lines: string[] = [];
    if (f.description?.trim()) {
      lines.push(`<!--@ feat_one_liner: ${f.description.trim()} @-->`);
    }
    if (f.specialities && f.specialities.length > 0) {
      lines.push(`<!--@ feat_specialities: ${f.specialities.join(", ")} @-->`);
    }
    if (f.subfeats && f.subfeats.length > 0) {
      for (const s of f.subfeats) {
        const parts: string[] = [s.kind];
        if (s.optional) parts.push("optional");
        if (s.kind === "fixed" && s.feat_title) parts.push(s.feat_title);
        else if (s.kind === "list" && s.options) parts.push(s.options.join("|"));
        else if (s.kind === "type" && s.filter) parts.push(s.filter);
        lines.push(`<!--@ feat_subfeat:${s.slot}: ${parts.join(", ")} @-->`);
      }
    }
    const rawFeat = feats?.find(feat => feat.id === f.id) as any;
    if (rawFeat?.unlocks_categories && rawFeat.unlocks_categories.length > 0) {
      lines.push(`<!--@ feat_unlocks: ${rawFeat.unlocks_categories.join(", ")} @-->`);
    }
    return lines.join("\n");
  };

  const handleCopyWikiTags = (f: Feat) => {
    const tags = generateWikiTags(f);
    if (!tags) {
      toast({ title: "No wiki tags to copy", description: "This feat has no metadata to export.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(tags);
    toast({ title: "Wiki tags copied to clipboard" });
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
                onClick={handleBulkRegenerate}
                size="sm"
                variant="outline"
                className="gap-2 font-display"
                disabled={bulkRegenerating || !feats?.length}
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
                              {f.description || <span className="italic">No description</span>}
                            </p>
                            {(hasSubfeats(f) || hasSpecialities(f)) && (
                              <div className="flex items-center gap-3 mt-1.5">
                                {hasSubfeats(f) && <StatusIcon ok={true} label="Subfeats" />}
                                {hasSpecialities(f) && <StatusIcon ok={true} label="Specialities" />}
                              </div>
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 border-t border-border space-y-3">
                          {/* Full description */}
                          <div className="pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                            <p className="text-sm text-foreground">
                              {f.description || <span className="italic text-muted-foreground">None</span>}
                            </p>
                          </div>

                          {/* Subfeats detail */}
                          {renderSubfeatsDetail(f.subfeats)}
                          {!hasSubfeats(f) && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Subfeats</p>
                              <p className="text-xs italic text-muted-foreground">None configured</p>
                            </div>
                          )}

                          {/* Specialities detail */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Specialities</p>
                            {hasSpecialities(f) ? (
                              <p className="text-xs text-foreground">{f.specialities!.join(", ")}</p>
                            ) : (
                              <p className="text-xs italic text-muted-foreground">None detected</p>
                            )}
                          </div>

                          {/* Full content */}
                          {f.content && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Content</p>
                              <pre className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 max-h-96 overflow-y-auto whitespace-pre-wrap">
                                {f.content}
                              </pre>
                            </div>
                          )}

                          {/* Actions */}
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
                              onClick={(e) => { e.stopPropagation(); handleCopyWikiTags(f); }}
                            >
                              <Copy className="h-3.5 w-3.5" /> Copy Wiki Tags
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
              <Label htmlFor="feat-description">Description</Label>
              <Textarea
                id="feat-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feat-content">Content (MediaWiki markup)</Label>
              <Textarea
                id="feat-content"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="== Section ==&#10;Content here..."
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            {editingId && (() => {
              const feat = feats?.find(f => f.id === editingId);
              return feat ? renderSubfeatsDetail(feat.subfeats) : null;
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
    </>
  );
};

export default ManageFeats;
