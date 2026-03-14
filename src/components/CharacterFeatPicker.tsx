import { useState, useMemo } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { sortTitlesEmojiLast } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Loader2, Pencil, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import FeatListItem from "@/components/FeatListItem";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { type SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";

import { useLocalRows } from "@/hooks/useLocalData";
import { upsertRow, deleteRow, deleteBy, getBy } from "@/lib/localStore";
import { triggerPush } from "@/lib/syncManager";
import { getAllFeats, getFeatMeta } from "@/data/feats";

interface CharacterFeatPickerProps {
  characterId: string;
  mode?: "player" | "gm";
  scenarioLevel?: number;
}

type Feat = {
  id: string;
  title: string;
  categories: string[];
  content: string | null;
  raw_content: string | null;
};

type CharacterFeat = {
  id: string;
  character_id: string;
  level: number;
  feat_id: string;
  is_free: boolean;
  note: string | null;
};

type CharacterFeatSubfeat = {
  id: string;
  character_feat_id: string;
  slot: number;
  subfeat_id: string;
};

const MAX_LEVEL = 10;
const MAX_SUBFEATS = 4;
const ARCHETYPE_DEFAULT_SLOTS = 3;

type PickerTarget =
  | { type: "level"; level: number }
  | { type: "free" }
  | { type: "subfeat"; characterFeatId: string; slot: number; slotMeta?: SubfeatSlot };

type ValidationResult = {
  allowed: boolean;
  reason: string;
  pendingAction: () => void;
} | null;

const CharacterFeatPicker = ({ characterId, mode = "player", scenarioLevel }: CharacterFeatPickerProps) => {
  const { t } = useTranslation();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFeatId, setExpandedFeatId] = useState<string | null>(null);
  const [expandedAssignedFeatId, setExpandedAssignedFeatId] = useState<string | null>(null);
  const [expandedSubfeatKey, setExpandedSubfeatKey] = useState<string | null>(null);

  // AI validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>(null);

  const allFeats = useMemo(() => getAllFeats() as Feat[], []);

  const metaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getFeatMeta>>();
    (allFeats ?? []).forEach((f) => {
      map.set(f.id, getFeatMeta(f));
    });
    return map;
  }, [allFeats]);

  const descriptionMap = useMemo(() => {
    const map = new Map<string, string>();
    metaMap.forEach((meta, id) => {
      if (meta.description) map.set(id, meta.description);
    });
    return map;
  }, [metaMap]);

  // Local-first data
  const characterFeats = useLocalRows<CharacterFeat>("character_feats", { character_id: characterId });
  const allSubfeats = useLocalRows<CharacterFeatSubfeat>("character_feat_subfeats");
  const characterSubfeats = useMemo(() => {
    const cfIds = new Set(characterFeats.map(cf => cf.id));
    return allSubfeats.filter(cs => cfIds.has(cs.character_feat_id));
  }, [allSubfeats, characterFeats]);

  // AI validation helper
  const validateWithAI = async (
    featId: string,
    action: () => void,
    pickType: "level" | "free" | "subfeat",
    level?: number | null,
    parentFeatTitle?: string | null,
  ) => {
    setValidating(true);
    setValidationResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("validate-feat", {
        body: { characterId, featId, pickType, level: level ?? null, parentFeatTitle: parentFeatTitle ?? null },
      });
      if (error) {
        console.error("AI validation error:", error);
        action();
        return;
      }
      if (data?.allowed) {
        action();
      } else {
        setValidationResult({
          allowed: false,
          reason: data?.reason || "The AI could not determine if this feat is valid.",
          pendingAction: action,
        });
      }
    } catch (e) {
      console.error("AI validation exception:", e);
      action();
    } finally {
      setValidating(false);
    }
  };

  // --- Mutations as plain functions ---

  const upsertFeat = (level: number, featId: string) => {
    // Delete existing feat at this level
    const existing = characterFeats.filter(cf => cf.level === level && !cf.is_free);
    for (const cf of existing) {
      deleteRow("character_feats", cf.id);
      // Also delete subfeats for old feat
      deleteBy("character_feat_subfeats", { character_feat_id: cf.id });
    }
    // Insert new
    const newId = crypto.randomUUID();
    upsertRow("character_feats", { id: newId, character_id: characterId, level, feat_id: featId, is_free: false, note: null });

    // Auto-insert fixed subfeats
    const meta = metaMap.get(featId);
    if (meta?.subfeats) {
      const fixedSlots = meta.subfeats.filter(s => s.kind === "fixed" && s.feat_title);
      for (const slot of fixedSlots) {
        const subfeat = featByTitle.get(slot.feat_title!);
        if (subfeat) {
          upsertRow("character_feat_subfeats", { id: crypto.randomUUID(), character_feat_id: newId, slot: slot.slot, subfeat_id: subfeat.id });
        }
      }
    }

    triggerPush();
    setPickerTarget(null);
    setSearchTerm("");
  };

  const deleteFeat = (level: number, isFree: boolean, id?: string) => {
    if (isFree && id) {
      deleteRow("character_feats", id);
    } else {
      const existing = characterFeats.filter(cf => cf.level === level && !cf.is_free);
      for (const cf of existing) {
        deleteRow("character_feats", cf.id);
        deleteBy("character_feat_subfeats", { character_feat_id: cf.id });
      }
    }
    triggerPush();
  };

  const addFreeFeat = (featId: string) => {
    upsertRow("character_feats", { id: crypto.randomUUID(), character_id: characterId, level: 0, feat_id: featId, is_free: true, note: null });
    triggerPush();
    setPickerTarget(null);
    setSearchTerm("");
  };

  const setSubfeat = (characterFeatId: string, slot: number, subfeatId: string | null) => {
    // Delete existing at this slot
    const existing = characterSubfeats.filter(cs => cs.character_feat_id === characterFeatId && cs.slot === slot);
    for (const cs of existing) {
      deleteRow("character_feat_subfeats", cs.id);
    }
    if (subfeatId) {
      upsertRow("character_feat_subfeats", { id: crypto.randomUUID(), character_feat_id: characterFeatId, slot, subfeat_id: subfeatId });
    }
    triggerPush();
    setPickerTarget(null);
    setSearchTerm("");
  };

  const featMap = useMemo(() => {
    const map = new Map<string, Feat>();
    (allFeats ?? []).forEach((f) => map.set(f.id, f));
    return map;
  }, [allFeats]);

  const featByTitle = useMemo(() => {
    const map = new Map<string, Feat>();
    (allFeats ?? []).forEach((f) => map.set(f.title, f));
    return map;
  }, [allFeats]);

  const subfeatMap = useMemo(() => {
    const map = new Map<string, CharacterFeatSubfeat[]>();
    (characterSubfeats ?? []).forEach((cs) => {
      const existing = map.get(cs.character_feat_id) || [];
      existing.push(cs);
      map.set(cs.character_feat_id, existing);
    });
    return map;
  }, [characterSubfeats]);

  const levelFeats = useMemo(() => (characterFeats ?? []).filter((cf) => !cf.is_free), [characterFeats]);
  const freeFeats = useMemo(() => (characterFeats ?? []).filter((cf) => cf.is_free), [characterFeats]);

  const hasArchetype = useMemo(() => {
    return levelFeats.some((cf) => {
      const feat = featMap.get(cf.feat_id);
      return feat?.categories?.includes("Archetype");
    });
  }, [levelFeats, featMap]);

  const maxFilledLevel = useMemo(() => {
    if (levelFeats.length === 0) return 0;
    return Math.max(...levelFeats.map((cf) => cf.level));
  }, [levelFeats]);

  const levelsToShow = Math.min(Math.max(maxFilledLevel + 1, 1), MAX_LEVEL);

  const isArchetype = (feat: Feat) => feat.categories?.includes("Archetype");

  const getSubfeatCount = (cfId: string) => (subfeatMap.get(cfId) || []).length;

  const getDefaultSlots = (feat: Feat, cfId: string) => {
    const existing = subfeatMap.get(cfId) || [];
    const existingCount = existing.length;
    if (isArchetype(feat)) {
      return Math.max(ARCHETYPE_DEFAULT_SLOTS, existingCount);
    }
    return existingCount;
  };

  const filteredFeats = useMemo(() => {
    if (!allFeats) return [];
    let filtered: Feat[];

    if (pickerTarget?.type === "subfeat") {
      const slotMeta = pickerTarget.slotMeta;
      if (slotMeta) {
        if (slotMeta.kind === "fixed" && slotMeta.feat_title) {
          filtered = allFeats.filter(f => f.title === slotMeta.feat_title);
        } else if (slotMeta.kind === "list" && slotMeta.options) {
          const optionSet = new Set(slotMeta.options);
          filtered = allFeats.filter(f => optionSet.has(f.title));
        } else if (slotMeta.kind === "type" && slotMeta.filter) {
          const filters = slotMeta.filter.split(",").map(s => s.trim()).filter(Boolean);
          const include = filters.filter(f => !f.startsWith("!"));
          const exclude = filters.filter(f => f.startsWith("!")).map(f => f.slice(1));
          filtered = allFeats.filter(f => {
            const cats = f.categories ?? [];
            if (include.length > 0 && !include.some(c => cats.includes(c))) return false;
            if (exclude.some(c => cats.includes(c))) return false;
            return true;
          });
        } else {
          filtered = [...allFeats];
        }
      } else {
        filtered = [...allFeats];
      }
    } else if (pickerTarget?.type === "free" || mode === "gm") {
      filtered = [...allFeats];
    } else {
      filtered = allFeats.filter(
        (f) => !f.categories?.includes("Hidden Feat")
      );
    }

    const ownedFeatIds = new Set((characterFeats ?? []).map(cf => cf.feat_id));
    filtered = filtered.filter(f => {
      if (f.categories?.includes("General Feat") && ownedFeatIds.has(f.id)) return false;
      return true;
    });

    const hasArch = (characterFeats ?? []).some(cf => {
      const feat = featMap.get(cf.feat_id);
      return feat && isArchetype(feat);
    });
    if (hasArch) {
      filtered = filtered.filter(f => !isArchetype(f) || ownedFeatIds.has(f.id));
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((f) => f.title.toLowerCase().includes(lower));
    }
    return filtered.sort(sortTitlesEmojiLast);
  }, [allFeats, searchTerm, mode, pickerTarget, characterFeats]);

  const openPicker = (target: PickerTarget) => {
    setPickerTarget(target);
    setSearchTerm("");
    setExpandedFeatId(null);
    setValidationResult(null);
  };

  const handleFeatSelect = (featId: string) => {
    if (!pickerTarget) return;

    const doAction = () => {
      if (pickerTarget.type === "level") {
        upsertFeat(pickerTarget.level, featId);
      } else if (pickerTarget.type === "free") {
        addFreeFeat(featId);
      } else if (pickerTarget.type === "subfeat") {
        setSubfeat(pickerTarget.characterFeatId, pickerTarget.slot, featId);
      }
    };

    let pickType: "level" | "free" | "subfeat" = pickerTarget.type;
    let level: number | null = pickerTarget.type === "level" ? pickerTarget.level : null;
    let parentFeatTitle: string | null = null;
    if (pickerTarget.type === "subfeat") {
      const parentCf = (characterFeats ?? []).find(cf => cf.id === pickerTarget.characterFeatId);
      const parentFeat = parentCf ? featMap.get(parentCf.feat_id) : null;
      parentFeatTitle = parentFeat?.title ?? null;
    }

    validateWithAI(featId, doAction, pickType, level, parentFeatTitle);
  };

  const dialogTitle = pickerTarget?.type === "level"
    ? `${t("feats.chooseFeatLevel")} ${pickerTarget.level}`
    : pickerTarget?.type === "subfeat"
    ? t("feats.chooseSubfeat")
    : t("feats.addFreeFeat");

  const renderSubfeats = (cf: CharacterFeat, feat: Feat) => {
    const subs = subfeatMap.get(cf.id) || [];
    const meta = isArchetype(feat) ? metaMap.get(cf.feat_id) : null;
    const metaSlots = meta?.subfeats ?? null;
    const currentCount = subs.length;

    const slotNumbers: number[] = [];
    const subsBySlot = new Map<number, CharacterFeatSubfeat>();
    const slotMetaByNum = new Map<number, SubfeatSlot>();
    subs.forEach(s => {
      subsBySlot.set(s.slot, s);
      slotNumbers.push(s.slot);
    });

    if (metaSlots) {
      metaSlots.forEach(s => {
        slotMetaByNum.set(s.slot, s);
        if (!slotNumbers.includes(s.slot)) slotNumbers.push(s.slot);
      });
    } else {
      const slotsToShow = getDefaultSlots(feat, cf.id);
      for (let i = 1; i <= slotsToShow; i++) {
        if (!slotNumbers.includes(i)) slotNumbers.push(i);
      }
    }
    slotNumbers.sort((a, b) => a - b);
    const canAddMore = currentCount < MAX_SUBFEATS;

    if (slotNumbers.length === 0 && !canAddMore) return null;

    return (
      <div className="ml-4 mt-1 space-y-1">
        {slotNumbers.map((slotNum) => {
          const assigned = subsBySlot.get(slotNum);
          const assignedFeat = assigned ? featMap.get(assigned.subfeat_id) : null;
          const subfeatKey = `${cf.id}-${slotNum}`;

          if (assignedFeat) {
            return (
              <div key={slotNum} className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">↳</span>
                <div className="flex-1 min-w-0">
                  <FeatListItem
                    feat={{ ...assignedFeat, description: descriptionMap.get(assignedFeat.id) ?? undefined }}
                    expanded={expandedSubfeatKey === subfeatKey}
                    onToggleExpand={() => setExpandedSubfeatKey(expandedSubfeatKey === subfeatKey ? null : subfeatKey)}
                    compact
                    actions={
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => openPicker({ type: "subfeat", characterFeatId: cf.id, slot: slotNum, slotMeta: slotMetaByNum.get(slotNum) })}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive"
                          onClick={() => setSubfeat(cf.id, slotNum, null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    }
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={slotNum} className="flex items-center gap-2 text-xs ml-1">
              <span className="text-muted-foreground">↳</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs text-muted-foreground"
                onClick={() => openPicker({ type: "subfeat", characterFeatId: cf.id, slot: slotNum, slotMeta: slotMetaByNum.get(slotNum) })}
              >
                + {t("feats.chooseSubfeatShort")}
              </Button>
            </div>
          );
        })}

        {canAddMore && (
          <div className="flex items-center gap-2 text-xs ml-1">
            <span className="text-muted-foreground">↳</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground"
              onClick={() => {
                const nextSlot = slotNumbers.length > 0 ? Math.max(...slotNumbers) + 1 : 1;
                openPicker({ type: "subfeat", characterFeatId: cf.id, slot: nextSlot });
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Picker view
  if (pickerTarget !== null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { setPickerTarget(null); setSearchTerm(""); setExpandedFeatId(null); setValidationResult(null); }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold">{dialogTitle}</p>
        </div>

        {validationResult && !validationResult.allowed && (
          <Alert variant="destructive">
            <span className="text-base" aria-hidden="true">🝍</span>
            <AlertTitle>AI says this feat may not be valid</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">{validationResult.reason}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const action = validationResult.pendingAction;
                  setValidationResult(null);
                  action();
                }}
              >
                Do it anyway
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-1">
          {validating && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Validating with AI...</span>
            </div>
          )}
          {!validating && filteredFeats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No feats found</p>
          ) : !validating && (
            filteredFeats.map((feat) => {
              const isExpanded = expandedFeatId === feat.id;
              return (
                <FeatListItem
                  key={feat.id}
                  feat={{ ...feat, description: descriptionMap.get(feat.id) ?? undefined }}
                  expanded={isExpanded}
                  onToggleExpand={() => setExpandedFeatId(isExpanded ? null : feat.id)}
                  onQuickAction={() => handleFeatSelect(feat.id)}
                  quickActionLabel="Select"
                />
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Main view: assigned feats by level
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">Feats per Level</p>
      </div>
      {Array.from({ length: levelsToShow }, (_, i) => i + 1).map((level) => {
        const assigned = levelFeats.find((cf) => cf.level === level);
        const assignedFeat = assigned ? featMap.get(assigned.feat_id) : null;

        const isInactive = scenarioLevel != null && level > scenarioLevel;

        return (
          <div key={level} className={`border border-border rounded-md p-3 ${isInactive ? "opacity-40 grayscale" : ""}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0 ${isInactive ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                {level}
              </span>

              {assignedFeat ? (
                <div className="flex-1 min-w-0">
                   <FeatListItem
                    feat={{ ...assignedFeat, description: descriptionMap.get(assignedFeat.id) ?? undefined }}
                    expanded={expandedAssignedFeatId === assigned!.id}
                    onToggleExpand={() => setExpandedAssignedFeatId(expandedAssignedFeatId === assigned!.id ? null : assigned!.id)}
                    actions={
                      <>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openPicker({ type: "level", level })}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1 text-destructive"
                          onClick={() => deleteFeat(level, false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    }
                    collapsedContent={assigned && assignedFeat ? renderSubfeats(assigned, assignedFeat) : undefined}
                    compact
                  />
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => openPicker({ type: "level", level })}>
                  + Choose feat
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Free Feats Section */}
      {(freeFeats.length > 0 || mode === "gm") && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <span className="text-base" aria-hidden="true">🜅</span> Free Feats
          </p>

          {freeFeats.length === 0 && mode === "gm" && (
            <p className="text-xs text-muted-foreground italic">No free feats granted yet.</p>
          )}

          {freeFeats.map((cf) => {
            const feat = featMap.get(cf.feat_id);
            if (!feat) return null;
            return (
              <FeatListItem
                key={cf.id}
                feat={{ ...feat, description: descriptionMap.get(feat.id) ?? undefined }}
                expanded={expandedAssignedFeatId === cf.id}
                onToggleExpand={() => setExpandedAssignedFeatId(expandedAssignedFeatId === cf.id ? null : cf.id)}
                actions={mode === "gm" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-destructive ml-auto shrink-0"
                    onClick={() => deleteFeat(0, true, cf.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                ) : undefined}
                collapsedContent={renderSubfeats(cf, feat)}
                compact
              />
            );
          })}

          {mode === "gm" && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => openPicker({ type: "free" })}>
              + Add free feat
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterFeatPicker;
