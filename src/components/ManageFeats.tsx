import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Sword, Loader2, Sparkles, Layers } from "lucide-react";
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
  const [regeneratingSubfeatsId, setRegeneratingSubfeatsId] = useState<string | null>(null);

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

  const handleRegenerate = async (id: string) => {
    setRegeneratingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-description", {
        body: { type: "feat", id },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
      toast({ title: "Description regenerated" });
    } catch (e: any) {
      toast({ title: "Regeneration failed", description: e.message, variant: "destructive" });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleRegenerateSubfeats = async (id: string) => {
    setRegeneratingSubfeatsId(id);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-description", {
        body: { action: "regenerate_subfeats", id },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-feats"] });
      toast({ title: "Subfeats regenerated" });
    } catch (e: any) {
      toast({ title: "Subfeat regeneration failed", description: e.message, variant: "destructive" });
    } finally {
      setRegeneratingSubfeatsId(null);
    }
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

  const renderSubfeatsBadge = (subfeats: SubfeatSlot[] | null) => {
    if (!subfeats || subfeats.length === 0) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground rounded px-1.5 py-0.5">
        <Layers className="h-3 w-3" />
        {subfeats.length} subfeat{subfeats.length > 1 ? "s" : ""}
      </span>
    );
  };

  const renderSubfeatsDetail = (subfeats: SubfeatSlot[] | null) => {
    if (!subfeats || subfeats.length === 0) return null;
    return (
      <div className="mt-2 space-y-1">
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
            <Button onClick={openCreate} size="sm" className="gap-2 font-display">
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !feats?.length ? (
            <p className="text-sm text-muted-foreground py-4">No feats yet.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden max-h-[28rem] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="w-36 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feats.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {f.title}
                          <FeatCategoryBadges categories={f.categories} />
                          {renderSubfeatsBadge(f.subfeats)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-[300px]">
                        {f.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegenerateSubfeats(f.id)}
                            disabled={regeneratingSubfeatsId === f.id}
                            title="Regenerate subfeats"
                          >
                            {regeneratingSubfeatsId === f.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Layers className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegenerate(f.id)}
                            disabled={regeneratingId === f.id}
                            title="Regenerate description"
                          >
                            {regeneratingId === f.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(f)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            {/* Show subfeats if editing */}
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
