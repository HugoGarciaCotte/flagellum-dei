import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Plus, Trash2, ChevronDown, Search } from "lucide-react";
import { getAllFeats, getFeatMeta, getAllFeatRedirects, type Feat, type FeatMeta, type FeatRedirect } from "@/data/feats";
import type { SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";
import SubfeatSlotEditor from "@/components/SubfeatSlotEditor";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import { downloadFile } from "@/lib/downloadFile";
import { toast } from "@/hooks/use-toast";

interface EditableFeat {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
  meta: FeatMeta;
}

const FeatEditorPanel = () => {
  const [feats, setFeats] = useState<EditableFeat[]>(() =>
    getAllFeats().map(f => ({
      ...f,
      meta: getFeatMeta(f),
    }))
  );
  const [redirects] = useState<FeatRedirect[]>(() => getAllFeatRedirects());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFeats = useMemo(() => {
    if (!searchTerm) return feats;
    const lower = searchTerm.toLowerCase();
    return feats.filter(f => f.title.toLowerCase().includes(lower));
  }, [feats, searchTerm]);

  const updateFeat = (id: string, patch: Partial<EditableFeat>) => {
    setFeats(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const updateMeta = (id: string, metaPatch: Partial<FeatMeta>) => {
    setFeats(prev => prev.map(f => f.id === id ? { ...f, meta: { ...f.meta, ...metaPatch } } : f));
  };

  const addFeat = () => {
    const newId = crypto.randomUUID();
    setFeats(prev => [...prev, {
      id: newId,
      title: "New Feat",
      categories: [],
      content: null,
      raw_content: null,
      meta: {},
    }]);
    setExpandedId(newId);
  };

  const deleteFeat = (id: string) => {
    setFeats(prev => prev.filter(f => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const addSubfeatSlot = (featId: string) => {
    setFeats(prev => prev.map(f => {
      if (f.id !== featId) return f;
      const existing = f.meta.subfeats ?? [];
      const nextSlot = existing.length > 0 ? Math.max(...existing.map(s => s.slot)) + 1 : 1;
      return {
        ...f,
        meta: { ...f.meta, subfeats: [...existing, { slot: nextSlot, kind: "fixed" as const }] },
      };
    }));
  };

  const updateSubfeat = (featId: string, slotIndex: number, updated: SubfeatSlot) => {
    setFeats(prev => prev.map(f => {
      if (f.id !== featId) return f;
      const subs = [...(f.meta.subfeats ?? [])];
      subs[slotIndex] = updated;
      return { ...f, meta: { ...f.meta, subfeats: subs } };
    }));
  };

  const removeSubfeat = (featId: string, slotIndex: number) => {
    setFeats(prev => prev.map(f => {
      if (f.id !== featId) return f;
      const subs = (f.meta.subfeats ?? []).filter((_, i) => i !== slotIndex);
      return { ...f, meta: { ...f.meta, subfeats: subs.length > 0 ? subs : undefined } };
    }));
  };

  const generateJson = (): string => {
    const exportFeats = feats.map(f => ({
      id: f.id,
      title: f.title,
      categories: f.categories,
      content: f.content,
      raw_content: f.raw_content,
      meta: Object.keys(f.meta).some(k => (f.meta as any)[k] != null && (f.meta as any)[k] !== undefined)
        ? {
            description: f.meta.description || undefined,
            prerequisites: f.meta.prerequisites || undefined,
            special: f.meta.special || undefined,
            specialities: f.meta.specialities?.length ? f.meta.specialities : undefined,
            subfeats: f.meta.subfeats?.length ? f.meta.subfeats : undefined,
            unlocks_categories: f.meta.unlocks_categories?.length ? f.meta.unlocks_categories : undefined,
            blocking: f.meta.blocking?.length ? f.meta.blocking : undefined,
            synonyms: f.meta.synonyms || undefined,
          }
        : null,
    }));

    return JSON.stringify({ feats: exportFeats, redirects }, null, 2);
  };

  const handleDownload = () => {
    downloadFile("feats-data.json", generateJson(), "application/json");
    toast({ title: "Downloaded", description: "feats-data.json downloaded. Replace src/data/feats-data.json with it." });
  };

  return (
    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg">Feats</h2>
          <Badge variant="outline" className="text-xs">{feats.length} feats</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addFeat} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-1">
            <Download className="h-3.5 w-3.5" /> Download feats-data.json
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search feats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-1 overflow-y-auto flex-1">
        {filteredFeats.map((feat) => (
          <Collapsible
            key={feat.id}
            open={expandedId === feat.id}
            onOpenChange={(open) => setExpandedId(open ? feat.id : null)}
          >
            <CollapsibleTrigger className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform shrink-0 ${expandedId === feat.id ? "rotate-0" : "-rotate-90"}`} />
              <span className="font-medium flex-1 truncate">{feat.title}</span>
              <FeatCategoryBadges categories={feat.categories} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 pt-1">
              <div className="space-y-3 border border-border rounded-md p-3 bg-muted/20">
                {/* Basic fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={feat.title}
                      onChange={(e) => updateFeat(feat.id, { title: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Categories (comma-separated)</Label>
                    <Input
                      value={feat.categories.join(", ")}
                      onChange={(e) => updateFeat(feat.id, { categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Meta fields */}
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={feat.meta.description ?? ""}
                    onChange={(e) => updateMeta(feat.id, { description: e.target.value || undefined })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Prerequisites</Label>
                    <Input
                      value={feat.meta.prerequisites ?? ""}
                      onChange={(e) => updateMeta(feat.id, { prerequisites: e.target.value || undefined })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Special</Label>
                    <Input
                      value={feat.meta.special ?? ""}
                      onChange={(e) => updateMeta(feat.id, { special: e.target.value || undefined })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Synonyms</Label>
                    <Input
                      value={feat.meta.synonyms ?? ""}
                      onChange={(e) => updateMeta(feat.id, { synonyms: e.target.value || undefined })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Specialities (comma-separated)</Label>
                    <Input
                      value={(feat.meta.specialities ?? []).join(", ")}
                      onChange={(e) => updateMeta(feat.id, { specialities: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Blocking (comma-separated)</Label>
                    <Input
                      value={(feat.meta.blocking ?? []).join(", ")}
                      onChange={(e) => updateMeta(feat.id, { blocking: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unlocks Categories (comma-separated)</Label>
                    <Input
                      value={(feat.meta.unlocks_categories ?? []).join(", ")}
                      onChange={(e) => updateMeta(feat.id, { unlocks_categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Subfeats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Subfeat Slots</Label>
                    <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={() => addSubfeatSlot(feat.id)}>
                      <Plus className="h-3 w-3" /> Add Slot
                    </Button>
                  </div>
                  {(feat.meta.subfeats ?? []).map((slot, idx) => (
                    <SubfeatSlotEditor
                      key={`${feat.id}-${idx}`}
                      slot={slot}
                      onChange={(updated) => updateSubfeat(feat.id, idx, updated)}
                      onRemove={() => removeSubfeat(feat.id, idx)}
                    />
                  ))}
                </div>

                {/* Content */}
                <div>
                  <Label className="text-xs">Content</Label>
                  <Textarea
                    value={feat.content ?? ""}
                    onChange={(e) => updateFeat(feat.id, { content: e.target.value || null })}
                    className="text-xs font-mono min-h-[100px]"
                  />
                </div>

                <div>
                  <Label className="text-xs">Raw Content</Label>
                  <Textarea
                    value={feat.raw_content ?? ""}
                    onChange={(e) => updateFeat(feat.id, { raw_content: e.target.value || null })}
                    className="text-xs font-mono min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" onClick={() => deleteFeat(feat.id)} className="gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default FeatEditorPanel;
