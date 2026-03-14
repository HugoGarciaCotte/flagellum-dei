import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Plus, Trash2, ChevronDown, Search, Loader2, AlertTriangle, Check } from "lucide-react";
import { getHardcodedFeats, getFeatMeta, getAllFeatRedirects, type Feat, type FeatMeta, type FeatRedirect } from "@/data/feats";
import type { SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";
import SubfeatSlotEditor from "@/components/SubfeatSlotEditor";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import { downloadFile } from "@/lib/downloadFile";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invalidateOverrides, type FeatOverrideMap } from "@/lib/featOverrides";

/** Fields that live inside meta */
const META_FIELDS = ["description", "prerequisites", "special", "specialities", "subfeats", "unlocks_categories", "blocking", "synonyms"] as const;
type MetaField = (typeof META_FIELDS)[number];

interface EditableFeat {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
  meta: FeatMeta;
}

const FeatEditorPanel = () => {
  const [hardcodedFeats] = useState<EditableFeat[]>(() =>
    getHardcodedFeats().map(f => ({ ...f, meta: getFeatMeta(f) }))
  );
  const [redirects] = useState<FeatRedirect[]>(() => getAllFeatRedirects());
  const [overrides, setOverrides] = useState<FeatOverrideMap>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

  // Load overrides from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("feat_overrides").select("feat_id, field, value");
      if (!cancelled && data) {
        const map: FeatOverrideMap = new Map();
        for (const row of data) {
          if (!map.has(row.feat_id)) map.set(row.feat_id, new Map());
          map.get(row.feat_id)!.set(row.field, row.value);
        }
        setOverrides(map);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  /** Get the effective value of a field, DB override winning over hardcoded. */
  const getEffective = useCallback((feat: EditableFeat, field: string): any => {
    const dbVal = overrides.get(feat.id)?.get(field);
    if (dbVal !== undefined) return dbVal;
    if (field === "title") return feat.title;
    if (field === "categories") return feat.categories;
    return (feat.meta as any)?.[field];
  }, [overrides]);

  /** Is a specific field overridden in DB? */
  const isOverridden = useCallback((featId: string, field: string): boolean => {
    return overrides.get(featId)?.has(field) ?? false;
  }, [overrides]);

  /** Count of feats with at least one override */
  const overriddenCount = useMemo(() => {
    let count = 0;
    for (const [, fields] of overrides) {
      if (fields.size > 0) count++;
    }
    return count;
  }, [overrides]);

  const mergedFeats = useMemo(() => {
    return hardcodedFeats.map(feat => {
      const fields = overrides.get(feat.id);
      if (!fields || fields.size === 0) return feat;
      const merged = { ...feat, meta: { ...feat.meta } };
      for (const [field, value] of fields) {
        if (field === "title") merged.title = value;
        else if (field === "categories") merged.categories = value;
        else (merged.meta as any)[field] = value;
      }
      return merged;
    });
  }, [hardcodedFeats, overrides]);

  const filteredFeats = useMemo(() => {
    if (!searchTerm) return mergedFeats;
    const lower = searchTerm.toLowerCase();
    return mergedFeats.filter(f => f.title.toLowerCase().includes(lower));
  }, [mergedFeats, searchTerm]);

  /** Upsert a single field override to DB */
  const saveField = async (featId: string, field: string, value: any) => {
    const key = `${featId}:${field}`;
    setSavingFields(prev => new Set(prev).add(key));
    try {
      const { error } = await supabase.from("feat_overrides").upsert(
        { feat_id: featId, field, value, updated_at: new Date().toISOString() },
        { onConflict: "feat_id,field" }
      );
      if (error) throw error;
      setOverrides(prev => {
        const next = new Map(prev);
        if (!next.has(featId)) next.set(featId, new Map());
        next.get(featId)!.set(field, value);
        return next;
      });
      invalidateOverrides();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSavingFields(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  /** Remove a single field override (revert to hardcoded) */
  const revertField = async (featId: string, field: string) => {
    const key = `${featId}:${field}`;
    setSavingFields(prev => new Set(prev).add(key));
    try {
      const { error } = await supabase.from("feat_overrides")
        .delete()
        .eq("feat_id", featId)
        .eq("field", field);
      if (error) throw error;
      setOverrides(prev => {
        const next = new Map(prev);
        const fields = next.get(featId);
        if (fields) {
          fields.delete(field);
          if (fields.size === 0) next.delete(featId);
        }
        return next;
      });
      invalidateOverrides();
    } catch (e: any) {
      toast({ title: "Revert failed", description: e.message, variant: "destructive" });
    }
    setSavingFields(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  const handleDownloadAndClear = async () => {
    // Build merged export
    const exportFeats = mergedFeats.map(f => ({
      id: f.id,
      title: f.title,
      categories: f.categories,
      content: f.content,
      raw_content: f.raw_content,
      meta: Object.keys(f.meta).some(k => (f.meta as any)[k] != null)
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

    const json = JSON.stringify({ feats: exportFeats, redirects }, null, 2);
    downloadFile("feats-data.json", json, "application/json");

    // Clear DB
    const { error } = await supabase.from("feat_overrides")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast({ title: "Downloaded but DB clear failed", description: error.message, variant: "destructive" });
    } else {
      setOverrides(new Map());
      invalidateOverrides();
      toast({ title: "Downloaded & DB cleared", description: "Replace src/data/feats-data.json with the downloaded file." });
    }
  };

  return (
    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg">Feats</h2>
          <Badge variant="outline" className="text-xs">{hardcodedFeats.length} feats</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadAndClear} className="gap-1">
            <Download className="h-3.5 w-3.5" /> Download JSON & Clear DB
          </Button>
        </div>
      </div>

      {/* Override banner */}
      {overriddenCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>{overriddenCount}</strong> feat{overriddenCount > 1 ? "s" : ""} modified in DB — download & export to persist changes in the static file.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search feats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1">
          {filteredFeats.map((feat) => {
            const hcFeat = hardcodedFeats.find(f => f.id === feat.id);
            const featHasOverrides = overrides.has(feat.id) && (overrides.get(feat.id)?.size ?? 0) > 0;

            return (
              <Collapsible
                key={feat.id}
                open={expandedId === feat.id}
                onOpenChange={(open) => setExpandedId(open ? feat.id : null)}
              >
                <CollapsibleTrigger className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 flex items-center gap-2 text-sm">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform shrink-0 ${expandedId === feat.id ? "rotate-0" : "-rotate-90"}`} />
                  <span className="font-medium flex-1 truncate">{feat.title}</span>
                  {featHasOverrides && <Badge variant="secondary" className="text-[10px]">Modified</Badge>}
                  <FeatCategoryBadges categories={feat.categories} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 pt-1">
                  <div className="space-y-3 border border-border rounded-md p-3 bg-muted/20">
                    {/* Title */}
                    <OverrideField
                      label="Title"
                      value={getEffective(feat, "title") ?? ""}
                      isOverridden={isOverridden(feat.id, "title")}
                      saving={savingFields.has(`${feat.id}:title`)}
                      onSave={(v) => saveField(feat.id, "title", v)}
                      onRevert={() => revertField(feat.id, "title")}
                    />

                    {/* Categories */}
                    <OverrideField
                      label="Categories (comma-separated)"
                      value={(getEffective(feat, "categories") ?? []).join(", ")}
                      isOverridden={isOverridden(feat.id, "categories")}
                      saving={savingFields.has(`${feat.id}:categories`)}
                      onSave={(v) => saveField(feat.id, "categories", v.split(",").map(s => s.trim()).filter(Boolean))}
                      onRevert={() => revertField(feat.id, "categories")}
                    />

                    {/* Meta string fields */}
                    {(["description", "prerequisites", "special", "synonyms"] as const).map(field => (
                      <OverrideField
                        key={field}
                        label={field.charAt(0).toUpperCase() + field.slice(1)}
                        value={getEffective(feat, field) ?? ""}
                        isOverridden={isOverridden(feat.id, field)}
                        saving={savingFields.has(`${feat.id}:${field}`)}
                        onSave={(v) => saveField(feat.id, field, v || null)}
                        onRevert={() => revertField(feat.id, field)}
                      />
                    ))}

                    {/* Meta array fields */}
                    {(["specialities", "blocking", "unlocks_categories"] as const).map(field => (
                      <OverrideField
                        key={field}
                        label={`${field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")} (comma-separated)`}
                        value={(getEffective(feat, field) ?? []).join(", ")}
                        isOverridden={isOverridden(feat.id, field)}
                        saving={savingFields.has(`${feat.id}:${field}`)}
                        onSave={(v) => saveField(feat.id, field, v.split(",").map(s => s.trim()).filter(Boolean))}
                        onRevert={() => revertField(feat.id, field)}
                      />
                    ))}

                    {/* Subfeats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Subfeat Slots</Label>
                        <div className="flex gap-1 items-center">
                          {isOverridden(feat.id, "subfeats") && (
                            <Badge variant="secondary" className="text-[10px] cursor-pointer" onClick={() => revertField(feat.id, "subfeats")}>
                              Revert
                            </Badge>
                          )}
                          <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={() => {
                            const existing = getEffective(feat, "subfeats") ?? [];
                            const nextSlot = existing.length > 0 ? Math.max(...existing.map((s: SubfeatSlot) => s.slot)) + 1 : 1;
                            saveField(feat.id, "subfeats", [...existing, { slot: nextSlot, kind: "fixed" }]);
                          }}>
                            <Plus className="h-3 w-3" /> Add Slot
                          </Button>
                        </div>
                      </div>
                      {(getEffective(feat, "subfeats") ?? []).map((slot: SubfeatSlot, idx: number) => (
                        <SubfeatSlotEditor
                          key={`${feat.id}-${idx}`}
                          slot={slot}
                          onChange={(updated) => {
                            const subs = [...(getEffective(feat, "subfeats") ?? [])];
                            subs[idx] = updated;
                            saveField(feat.id, "subfeats", subs);
                          }}
                          onRemove={() => {
                            const subs = (getEffective(feat, "subfeats") ?? []).filter((_: any, i: number) => i !== idx);
                            saveField(feat.id, "subfeats", subs.length > 0 ? subs : null);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Reusable inline field editor with override indicator */
function OverrideField({
  label,
  value,
  isOverridden,
  saving,
  onSave,
  onRevert,
}: {
  label: string;
  value: string;
  isOverridden: boolean;
  saving: boolean;
  onSave: (v: string) => void;
  onRevert: () => void;
}) {
  const [local, setLocal] = useState(value);
  const dirty = local !== value;

  // Sync when upstream changes
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <Label className="text-xs">{label}</Label>
        {isOverridden && (
          <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-destructive/20" onClick={onRevert}>
            DB override — click to revert
          </Badge>
        )}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className="h-8 text-sm flex-1"
        />
        {dirty && (
          <Button size="icon" variant="default" className="h-8 w-8 shrink-0" disabled={saving} onClick={() => onSave(local)}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

export default FeatEditorPanel;
