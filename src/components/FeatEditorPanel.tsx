import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Plus, Trash2, ChevronDown, Search, Loader2, AlertTriangle, Check, Sparkles } from "lucide-react";
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

const GENERATABLE_FIELDS = ["description", "prerequisites", "specialities", "blocking", "unlocks_categories", "subfeats"] as const;
type GeneratableField = (typeof GENERATABLE_FIELDS)[number];

const FIELD_LABELS: Record<GeneratableField, string> = {
  description: "Description",
  prerequisites: "Prerequisites",
  specialities: "Specialities",
  blocking: "Blocking",
  unlocks_categories: "Unlocks categories",
  subfeats: "Subfeat slots",
};

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
  const [generatingFields, setGeneratingFields] = useState<Set<string>>(new Set());

  // Bulk generation state
  const [bulkField, setBulkField] = useState<GeneratableField | "all">("description");
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const bulkAbortRef = useRef(false);

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

  /** Call AI to generate metadata for a feat */
  const generateForFeat = async (feat: EditableFeat, fields: GeneratableField[]): Promise<Record<string, any> | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-feat-metadata", {
        body: {
          feat_title: feat.title,
          feat_categories: feat.categories,
          feat_content: feat.content,
          feat_raw_content: feat.raw_content,
          fields,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (e: any) {
      toast({ title: `Generation failed for "${feat.title}"`, description: e.message, variant: "destructive" });
      return null;
    }
  };

  /** Generate a single field for a single feat and auto-save */
  const handleGenerateField = async (feat: EditableFeat, field: GeneratableField) => {
    const key = `${feat.id}:${field}`;
    setGeneratingFields(prev => new Set(prev).add(key));
    const result = await generateForFeat(feat, [field]);
    if (result && field in result) {
      const value = result[field];
      // For array fields, save empty arrays as null
      const saveValue = Array.isArray(value) && value.length === 0 ? null : value;
      if (saveValue != null) {
        await saveField(feat.id, field, saveValue);
      }
    }
    setGeneratingFields(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  /** Generate all empty fields for a single feat */
  const handleGenerateAllForFeat = async (feat: EditableFeat) => {
    const emptyFields = GENERATABLE_FIELDS.filter(f => {
      const val = getEffective(feat, f);
      return val == null || val === "" || (Array.isArray(val) && val.length === 0);
    });
    if (emptyFields.length === 0) {
      toast({ title: "Nothing to generate", description: "All fields already have values." });
      return;
    }
    for (const f of emptyFields) {
      setGeneratingFields(prev => new Set(prev).add(`${feat.id}:${f}`));
    }
    const result = await generateForFeat(feat, [...emptyFields]);
    if (result) {
      for (const field of emptyFields) {
        if (field in result) {
          const value = result[field];
          const saveValue = Array.isArray(value) && value.length === 0 ? null : value;
          if (saveValue != null) {
            await saveField(feat.id, field, saveValue);
          }
        }
      }
    }
    for (const f of emptyFields) {
      setGeneratingFields(prev => { const s = new Set(prev); s.delete(`${feat.id}:${f}`); return s; });
    }
  };

  /** Bulk generate a field (or all) for all feats missing it */
  const handleBulkGenerate = async () => {
    const fieldsToGenerate: GeneratableField[] = bulkField === "all"
      ? [...GENERATABLE_FIELDS]
      : [bulkField];

    // Find feats that are missing at least one of the requested fields
    const featsToProcess = mergedFeats.filter(feat => {
      return fieldsToGenerate.some(f => {
        const val = getEffective(feat, f);
        return val == null || val === "" || (Array.isArray(val) && val.length === 0);
      });
    });

    if (featsToProcess.length === 0) {
      toast({ title: "Nothing to generate", description: `All feats already have ${bulkField === "all" ? "all fields" : FIELD_LABELS[bulkField]}.` });
      return;
    }

    setBulkGenerating(true);
    bulkAbortRef.current = false;
    setBulkProgress({ done: 0, total: featsToProcess.length });

    for (let i = 0; i < featsToProcess.length; i++) {
      if (bulkAbortRef.current) break;
      const feat = featsToProcess[i];

      // Determine which of the requested fields are actually empty for this feat
      const emptyFields = fieldsToGenerate.filter(f => {
        const val = getEffective(feat, f);
        return val == null || val === "" || (Array.isArray(val) && val.length === 0);
      });

      if (emptyFields.length > 0) {
        const result = await generateForFeat(feat, emptyFields);
        if (result) {
          for (const field of emptyFields) {
            if (field in result) {
              const value = result[field];
              const saveValue = Array.isArray(value) && value.length === 0 ? null : value;
              if (saveValue != null) {
                await saveField(feat.id, field, saveValue);
              }
            }
          }
        }
      }

      setBulkProgress({ done: i + 1, total: featsToProcess.length });
      // Rate limit delay
      if (i < featsToProcess.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setBulkGenerating(false);
    if (!bulkAbortRef.current) {
      toast({ title: "Bulk generation complete", description: `Processed ${featsToProcess.length} feats.` });
    }
  };

  const handleDownloadAndClear = async () => {
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

      {/* Bulk AI generation toolbar */}
      <div className="flex items-center gap-2 flex-wrap rounded-lg border border-border p-3 bg-muted/30">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium">Generate with AI:</span>
        <Select value={bulkField} onValueChange={(v) => setBulkField(v as any)}>
          <SelectTrigger className="h-8 w-[180px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fields</SelectItem>
            {GENERATABLE_FIELDS.map(f => (
              <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="default"
          className="gap-1"
          disabled={bulkGenerating || loading}
          onClick={handleBulkGenerate}
        >
          {bulkGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {bulkProgress.done}/{bulkProgress.total}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Generate All Missing
            </>
          )}
        </Button>
        {bulkGenerating && (
          <Button size="sm" variant="outline" onClick={() => { bulkAbortRef.current = true; }}>
            Stop
          </Button>
        )}
      </div>

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
                    {/* Generate All for this feat */}
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        disabled={generatingFields.size > 0}
                        onClick={() => handleGenerateAllForFeat(feat)}
                      >
                        <Sparkles className="h-3 w-3" /> Generate All Empty
                      </Button>
                    </div>

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

                    {/* Meta string fields with AI generation */}
                    {(["description", "prerequisites", "special", "synonyms"] as const).map(field => {
                      const isGeneratable = GENERATABLE_FIELDS.includes(field as any);
                      return (
                        <OverrideField
                          key={field}
                          label={field.charAt(0).toUpperCase() + field.slice(1)}
                          value={getEffective(feat, field) ?? ""}
                          isOverridden={isOverridden(feat.id, field)}
                          saving={savingFields.has(`${feat.id}:${field}`)}
                          generating={generatingFields.has(`${feat.id}:${field}`)}
                          onSave={(v) => saveField(feat.id, field, v || null)}
                          onRevert={() => revertField(feat.id, field)}
                          onGenerate={isGeneratable ? () => handleGenerateField(feat, field as GeneratableField) : undefined}
                        />
                      );
                    })}

                    {/* Meta array fields with AI generation */}
                    {(["specialities", "blocking", "unlocks_categories"] as const).map(field => (
                      <OverrideField
                        key={field}
                        label={`${field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")} (comma-separated)`}
                        value={(getEffective(feat, field) ?? []).join(", ")}
                        isOverridden={isOverridden(feat.id, field)}
                        saving={savingFields.has(`${feat.id}:${field}`)}
                        generating={generatingFields.has(`${feat.id}:${field}`)}
                        onSave={(v) => saveField(feat.id, field, v.split(",").map(s => s.trim()).filter(Boolean))}
                        onRevert={() => revertField(feat.id, field)}
                        onGenerate={() => handleGenerateField(feat, field)}
                      />
                    ))}

                    {/* Subfeats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-medium">Subfeat Slots</Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={generatingFields.has(`${feat.id}:subfeats`)}
                            onClick={() => handleGenerateField(feat, "subfeats")}
                          >
                            {generatingFields.has(`${feat.id}:subfeats`)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Sparkles className="h-3 w-3 text-primary" />
                            }
                          </Button>
                        </div>
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

/** Reusable inline field editor with override indicator and AI generation */
function OverrideField({
  label,
  value,
  isOverridden,
  saving,
  generating,
  onSave,
  onRevert,
  onGenerate,
}: {
  label: string;
  value: string;
  isOverridden: boolean;
  saving: boolean;
  generating?: boolean;
  onSave: (v: string) => void;
  onRevert: () => void;
  onGenerate?: () => void;
}) {
  const [local, setLocal] = useState(value);
  const dirty = local !== value;

  // Sync when upstream changes
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <Label className="text-xs">{label}</Label>
        {onGenerate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            disabled={generating}
            onClick={onGenerate}
            title={`Generate ${label} with AI`}
          >
            {generating
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3 text-primary" />
            }
          </Button>
        )}
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
