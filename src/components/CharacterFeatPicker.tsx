import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sortTitlesEmojiLast } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Gift, Loader2, WifiOff, ChevronDown, Pencil } from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  cacheFeats,
  getCachedFeats,
  cacheCharacterFeats,
  getCachedCharacterFeats,
} from "@/lib/offlineStorage";
import FeatDetailsDisplay from "@/components/FeatDetailsDisplay";

interface CharacterFeatPickerProps {
  characterId: string;
  mode?: "player" | "gm";
  scenarioLevel?: number;
}

type Feat = {
  id: string;
  title: string;
  categories: string[];
  description: string | null;
  content: string | null;
  subfeats: SubfeatSlot[] | null;
  unlocks_categories: string[] | null;
};

type SubfeatSlot = {
  slot: number;
  kind: "fixed" | "list" | "type";
  feat_title?: string;
  options?: string[];
  filter?: string;
  optional?: boolean;
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

type PickerTarget =
  | { type: "level"; level: number }
  | { type: "free" }
  | { type: "subfeat"; characterFeatId: string; slot: SubfeatSlot };

const CharacterFeatPicker = ({ characterId, mode = "player", scenarioLevel }: CharacterFeatPickerProps) => {
  const queryClient = useQueryClient();
  const online = useNetworkStatus();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"archetype" | "feat">("feat");
  const [validatingFeat, setValidatingFeat] = useState<string | null>(null);
  const [expandedFeatId, setExpandedFeatId] = useState<string | null>(null);
  const [expandedAssignedFeatId, setExpandedAssignedFeatId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const noteInputRef = useRef<HTMLInputElement>(null);
  const [pendingSubfeatSlots, setPendingSubfeatSlots] = useState<{ characterFeatId: string; slot: SubfeatSlot }[]>([]);

  const { data: allFeats } = useQuery({
    queryKey: ["all-feats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feats")
        .select("id, title, categories, description, content, subfeats, unlocks_categories")
        .order("title");
      if (error) throw error;
      return data as unknown as Feat[];
    },
    placeholderData: () => getCachedFeats() as Feat[] | undefined ?? undefined,
  });

  useEffect(() => {
    if (allFeats && allFeats.length > 0 && online) {
      cacheFeats(allFeats);
    }
  }, [allFeats, online]);

  const { data: characterFeats } = useQuery({
    queryKey: ["character-feats", characterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_feats")
        .select("*")
        .eq("character_id", characterId)
        .order("level");
      if (error) throw error;
      return data as CharacterFeat[];
    },
    enabled: !!characterId,
    placeholderData: () => getCachedCharacterFeats(characterId) as CharacterFeat[] | undefined ?? undefined,
  });

  useEffect(() => {
    if (characterFeats && online) {
      cacheCharacterFeats(characterId, characterFeats);
    }
  }, [characterFeats, characterId, online]);

  const { data: characterSubfeats } = useQuery({
    queryKey: ["character-feat-subfeats", characterId],
    queryFn: async () => {
      const cfIds = (characterFeats ?? []).map(cf => cf.id);
      if (cfIds.length === 0) return [];
      const { data, error } = await supabase
        .from("character_feat_subfeats")
        .select("*")
        .in("character_feat_id", cfIds);
      if (error) throw error;
      return data as CharacterFeatSubfeat[];
    },
    enabled: !!characterId && (characterFeats ?? []).length > 0,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ level, featId }: { level: number; featId: string }) => {
      if (mode === "player") {
        setValidatingFeat(featId);
        try {
          const { data, error } = await supabase.functions.invoke("validate-feat", {
            body: { characterId, featId },
          });
          if (error) {
            console.error("Validation error:", error);
          } else if (data && !data.allowed) {
            throw new Error(data.reason || "Prerequisites not met");
          }
        } finally {
          setValidatingFeat(null);
        }
      }

      await supabase
        .from("character_feats")
        .delete()
        .eq("character_id", characterId)
        .eq("level", level)
        .eq("is_free", false);
      const { data: inserted, error } = await supabase
        .from("character_feats")
        .insert({ character_id: characterId, level, feat_id: featId, is_free: false })
        .select()
        .single();
      if (error) throw error;

      // Auto-insert fixed subfeats
      const feat = featMap.get(featId);
      if (feat?.subfeats && inserted) {
        const fixedSlots = feat.subfeats.filter(s => s.kind === "fixed" && s.feat_title);
        for (const slot of fixedSlots) {
          const subfeat = allFeats?.find(f => f.title === slot.feat_title);
          if (subfeat) {
            await supabase.from("character_feat_subfeats").insert({
              character_feat_id: inserted.id,
              slot: slot.slot,
              subfeat_id: subfeat.id,
            });
          }
        }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
      queryClient.invalidateQueries({ queryKey: ["character-feat-subfeats", characterId] });

      // Check if the feat has non-fixed subfeats that need picking
      const feat = featMap.get(variables.featId);
      const nonFixedSlots = (feat?.subfeats ?? []).filter(s => s.kind !== "fixed");
      if (nonFixedSlots.length > 0) {
        // We need the inserted character_feat id — re-query to find it
        supabase
          .from("character_feats")
          .select("id")
          .eq("character_id", characterId)
          .eq("level", variables.level)
          .eq("is_free", false)
          .single()
          .then(({ data: cfRow }) => {
            if (cfRow) {
              const queue = nonFixedSlots.map(s => ({ characterFeatId: cfRow.id, slot: s }));
              setPendingSubfeatSlots(queue.slice(1));
              setSearchTerm("");
              setExpandedFeatId(null);
              setPickerTarget({ type: "subfeat", characterFeatId: cfRow.id, slot: queue[0].slot });
            } else {
              setPickerTarget(null);
              setSearchTerm("");
            }
          });
      } else {
        setPickerTarget(null);
        setSearchTerm("");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ level, isFree, id }: { level: number; isFree: boolean; id?: string }) => {
      if (isFree && id) {
        const { error } = await supabase.from("character_feats").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("character_feats")
          .delete()
          .eq("character_id", characterId)
          .eq("level", level)
          .eq("is_free", false);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
      queryClient.invalidateQueries({ queryKey: ["character-feat-subfeats", characterId] });
    },
  });

  const addFreeFeatMutation = useMutation({
    mutationFn: async (featId: string) => {
      const { error } = await supabase
        .from("character_feats")
        .insert({ character_id: characterId, level: 0, feat_id: featId, is_free: true });
      if (error) throw error;
    },
    onSuccess: (_data, featId) => {
      queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });

      // Check for non-fixed subfeats
      const feat = featMap.get(featId);
      const nonFixedSlots = (feat?.subfeats ?? []).filter(s => s.kind !== "fixed");
      if (nonFixedSlots.length > 0) {
        supabase
          .from("character_feats")
          .select("id")
          .eq("character_id", characterId)
          .eq("feat_id", featId)
          .eq("is_free", true)
          .order("level", { ascending: false })
          .limit(1)
          .single()
          .then(({ data: cfRow }) => {
            if (cfRow) {
              const queue = nonFixedSlots.map(s => ({ characterFeatId: cfRow.id, slot: s }));
              setPendingSubfeatSlots(queue.slice(1));
              setSearchTerm("");
              setExpandedFeatId(null);
              setPickerTarget({ type: "subfeat", characterFeatId: cfRow.id, slot: queue[0].slot });
            } else {
              setPickerTarget(null);
              setSearchTerm("");
            }
          });
      } else {
        setPickerTarget(null);
        setSearchTerm("");
      }
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const trimmed = note.trim() || null;
      const { error } = await supabase
        .from("character_feats")
        .update({ note: trimmed } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
      setEditingNoteId(null);
    },
  });

  const setSubfeatMutation = useMutation({
    mutationFn: async ({ characterFeatId, slot, subfeatId }: { characterFeatId: string; slot: number; subfeatId: string | null }) => {
      // Delete existing
      await supabase.from("character_feat_subfeats")
        .delete()
        .eq("character_feat_id", characterFeatId)
        .eq("slot", slot);
      // Insert new if provided
      if (subfeatId) {
        const { error } = await supabase.from("character_feat_subfeats").insert({
          character_feat_id: characterFeatId,
          slot,
          subfeat_id: subfeatId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-feat-subfeats", characterId] });
      setPickerTarget(null);
      setSearchTerm("");
    },
  });

  const startEditingNote = (cf: CharacterFeat) => {
    setEditingNoteId(cf.id);
    setNoteValue(cf.note ?? "");
    setTimeout(() => noteInputRef.current?.focus(), 50);
  };

  const saveNote = (id: string) => {
    updateNoteMutation.mutate({ id, note: noteValue });
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

  const archetypeLevel = useMemo(() => {
    const cf = levelFeats.find((cf) => {
      const feat = featMap.get(cf.feat_id);
      return feat?.categories?.includes("Archetype");
    });
    return cf?.level ?? null;
  }, [levelFeats, featMap]);

  const maxFilledLevel = useMemo(() => {
    if (levelFeats.length === 0) return 0;
    return Math.max(...levelFeats.map((cf) => cf.level));
  }, [levelFeats]);

  const levelsToShow = Math.min(Math.max(maxFilledLevel + 1, 1), MAX_LEVEL);

  const canPickArchetype = (level: number) => {
    if (mode === "gm") return false;
    if (!hasArchetype) return true;
    return archetypeLevel === level;
  };

  const showArchetypeToggle = pickerTarget?.type === "level" && mode === "player" && canPickArchetype(pickerTarget.level);

  const filteredFeats = useMemo(() => {
    if (!allFeats) return [];
    let filtered: Feat[];

    if (pickerTarget?.type === "subfeat") {
      // Filter for subfeat picking
      const slot = pickerTarget.slot;
      if (slot.kind === "list" && slot.options) {
        filtered = allFeats.filter(f => slot.options!.includes(f.title));
      } else if (slot.kind === "type" && slot.filter) {
        const excludeCategories = slot.filter.split(",").map(f => f.trim().replace("not:", ""));
        filtered = allFeats.filter(f =>
          !f.categories?.some(c => excludeCategories.includes(c))
        );
      } else {
        filtered = [];
      }
    } else if (pickerTarget?.type === "free" || mode === "gm") {
      filtered = [...allFeats];
    } else if (filterMode === "archetype") {
      filtered = allFeats.filter((f) => f.categories?.includes("Archetype"));
    } else {
      // Gather unlocked categories from owned feats
      const unlockedCategories = new Set<string>();
      for (const cf of characterFeats ?? []) {
        const feat = featMap?.get(cf.feat_id);
        if (feat?.unlocks_categories) {
          feat.unlocks_categories.forEach((c: string) => unlockedCategories.add(c));
        }
      }
      filtered = allFeats.filter(
        (f) =>
          (f.categories?.includes("General Feat") ||
            f.categories?.includes("Prowess") ||
            f.categories?.some((c) => unlockedCategories.has(c))) &&
          !f.categories?.includes("Hidden Feat")
      );
    }

    // Hide General Feats already owned by the character
    const ownedFeatIds = new Set((characterFeats ?? []).map(cf => cf.feat_id));
    filtered = filtered.filter(f => {
      if (f.categories?.includes("General Feat") && ownedFeatIds.has(f.id)) return false;
      return true;
    });

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((f) => f.title.toLowerCase().includes(lower));
    }
    return filtered.sort(sortTitlesEmojiLast);
  }, [allFeats, filterMode, searchTerm, mode, pickerTarget, characterFeats, featMap]);

  const openPicker = (target: PickerTarget) => {
    if (!online) return;
    setPickerTarget(target);
    setSearchTerm("");
    setExpandedFeatId(null);
    if (target.type === "level" && mode !== "gm") {
      setFilterMode(canPickArchetype(target.level) ? "archetype" : "feat");
    } else {
      setFilterMode("feat");
    }
  };

  const handleFeatSelect = (featId: string) => {
    if (!pickerTarget) return;
    if (pickerTarget.type === "level") {
      upsertMutation.mutate({ level: pickerTarget.level, featId });
    } else if (pickerTarget.type === "free") {
      addFreeFeatMutation.mutate(featId);
    } else if (pickerTarget.type === "subfeat") {
      setSubfeatMutation.mutate({
        characterFeatId: pickerTarget.characterFeatId,
        slot: pickerTarget.slot.slot,
        subfeatId: featId,
      });
    }
  };

  const dialogTitle = pickerTarget?.type === "level"
    ? `Choose Feat — Level ${pickerTarget.level}`
    : pickerTarget?.type === "subfeat"
    ? `Choose Subfeat — Slot ${pickerTarget.slot.slot}`
    : "Add Free Feat";

  // Helper to check if filter matches for type-based subfeat resolution
  const matchesFilter = (feat: Feat, filter: string): boolean => {
    const excludeCategories = filter.split(",").map(f => f.trim().replace("not:", ""));
    return !feat.categories?.some(c => excludeCategories.includes(c));
  };

  const renderSubfeats = (cf: CharacterFeat, feat: Feat) => {
    if (!feat.subfeats || feat.subfeats.length === 0) return null;
    const subs = subfeatMap.get(cf.id) || [];

    return (
      <div className="ml-6 mt-1 space-y-1">
        {feat.subfeats.map((slot) => {
          const assigned = subs.find(s => s.slot === slot.slot);
          const assignedFeat = assigned ? featMap.get(assigned.subfeat_id) : null;

          if (slot.kind === "fixed") {
            const fixedFeat = assignedFeat || (slot.feat_title ? featByTitle.get(slot.feat_title) : null);
            return (
              <div key={slot.slot} className="flex items-center gap-2 text-xs border-l-2 border-primary/30 pl-2">
                <span className="text-muted-foreground">↳</span>
                <span className="font-medium text-foreground">{fixedFeat?.title || slot.feat_title || "—"}</span>
                <span className="text-muted-foreground italic">(granted)</span>
              </div>
            );
          }

          if (slot.kind === "list") {
            const options = slot.options || [];
            const featOptions = options.map(t => featByTitle.get(t)).filter(Boolean) as Feat[];

            return (
              <div key={slot.slot} className="flex items-center gap-2 text-xs border-l-2 border-primary/30 pl-2">
                <span className="text-muted-foreground">↳</span>
                {online ? (
                  <Select
                    value={assigned?.subfeat_id || "__none__"}
                    onValueChange={(val) => {
                      setSubfeatMutation.mutate({
                        characterFeatId: cf.id,
                        slot: slot.slot,
                        subfeatId: val === "__none__" ? null : val,
                      });
                    }}
                  >
                    <SelectTrigger className="h-6 text-xs w-auto min-w-[120px]">
                      <SelectValue placeholder="Pick..." />
                    </SelectTrigger>
                    <SelectContent>
                      {slot.optional && <SelectItem value="__none__">None</SelectItem>}
                      {featOptions.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium text-foreground">{assignedFeat?.title || "—"}</span>
                )}
              </div>
            );
          }

          if (slot.kind === "type") {
            return (
              <div key={slot.slot} className="flex items-center gap-2 text-xs border-l-2 border-primary/30 pl-2">
                <span className="text-muted-foreground">↳</span>
                {assignedFeat ? (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{assignedFeat.title}</span>
                    {online && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-xs"
                        onClick={() => openPicker({ type: "subfeat", characterFeatId: cf.id, slot })}
                      >
                        Edit
                      </Button>
                    )}
                    {online && slot.optional && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-destructive"
                        onClick={() => setSubfeatMutation.mutate({ characterFeatId: cf.id, slot: slot.slot, subfeatId: null })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : online ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs text-muted-foreground"
                    onClick={() => openPicker({ type: "subfeat", characterFeatId: cf.id, slot })}
                  >
                    + Choose subfeat
                  </Button>
                ) : (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">Feats per Level</p>
        {!online && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <WifiOff className="h-3 w-3" /> Read-only
          </span>
        )}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-sm font-medium text-foreground truncate text-left hover:underline"
                      onClick={() => setExpandedAssignedFeatId(expandedAssignedFeatId === assigned!.id ? null : assigned!.id)}
                    >
                      {assignedFeat.title}
                    </button>
                    {assigned!.note && editingNoteId !== assigned!.id && (
                      <span className="text-xs text-muted-foreground italic shrink-0">({assigned!.note})</span>
                    )}
                    {editingNoteId === assigned!.id ? (
                      <form
                        className="flex items-center gap-1 shrink-0"
                        onSubmit={(e) => { e.preventDefault(); saveNote(assigned!.id); }}
                      >
                        <Input
                          ref={noteInputRef}
                          value={noteValue}
                          onChange={(e) => setNoteValue(e.target.value)}
                          className="h-6 text-xs w-24"
                          placeholder="note..."
                          onBlur={() => saveNote(assigned!.id)}
                        />
                      </form>
                    ) : (
                      online && (
                        <button
                          type="button"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => startEditingNote(assigned!)}
                          title="Add note"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )
                    )}
                    <FeatCategoryBadges categories={assignedFeat.categories} />
                    <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expandedAssignedFeatId === assigned!.id ? "rotate-180" : ""}`} />
                    {online && (
                      <div className="ml-auto flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openPicker({ type: "level", level })}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1 text-destructive"
                          onClick={() => deleteMutation.mutate({ level, isFree: false })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {assignedFeat.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{assignedFeat.description}</p>
                  )}
                  {expandedAssignedFeatId === assigned!.id && assignedFeat.content && (
                    <FeatDetailsDisplay content={assignedFeat.content} />
                  )}
                  {/* Subfeats */}
                  {assigned && assignedFeat && renderSubfeats(assigned, assignedFeat)}
                </div>
              ) : (
                online ? (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => openPicker({ type: "level", level })}>
                    + Choose feat
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Empty</span>
                )
              )}
            </div>
          </div>
        );
      })}

      {/* Free Feats Section */}
      {(freeFeats.length > 0 || (mode === "gm" && online)) && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Gift className="h-4 w-4" /> Free Feats
          </p>

          {freeFeats.length === 0 && mode === "gm" && (
            <p className="text-xs text-muted-foreground italic">No free feats granted yet.</p>
          )}

          {freeFeats.map((cf) => {
            const feat = featMap.get(cf.feat_id);
            if (!feat) return null;
            return (
              <div key={cf.id} className="border border-border rounded-md p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground truncate text-left hover:underline"
                    onClick={() => setExpandedAssignedFeatId(expandedAssignedFeatId === cf.id ? null : cf.id)}
                  >
                    {feat.title}
                  </button>
                  {cf.note && editingNoteId !== cf.id && (
                    <span className="text-xs text-muted-foreground italic shrink-0">({cf.note})</span>
                  )}
                  {editingNoteId === cf.id ? (
                    <form
                      className="flex items-center gap-1 shrink-0"
                      onSubmit={(e) => { e.preventDefault(); saveNote(cf.id); }}
                    >
                      <Input
                        ref={noteInputRef}
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        className="h-6 text-xs w-24"
                        placeholder="note..."
                        onBlur={() => saveNote(cf.id)}
                      />
                    </form>
                  ) : (
                    online && (
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditingNote(cf)}
                        title="Add note"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )
                  )}
                  <FeatCategoryBadges categories={feat.categories} />
                  <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expandedAssignedFeatId === cf.id ? "rotate-180" : ""}`} />
                  {mode === "gm" && online && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-destructive ml-auto shrink-0"
                      onClick={() => deleteMutation.mutate({ level: 0, isFree: true, id: cf.id })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {feat.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{feat.description}</p>
                )}
                {expandedAssignedFeatId === cf.id && feat.content && (
                  <FeatDetailsDisplay content={feat.content} />
                )}
                {/* Subfeats for free feats */}
                {renderSubfeats(cf, feat)}
              </div>
            );
          })}

          {mode === "gm" && online && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => openPicker({ type: "free" })}>
              + Add free feat
            </Button>
          )}
        </div>
      )}

      {/* Fullscreen Feat Picker Dialog */}
      <Dialog open={pickerTarget !== null} onOpenChange={(open) => { if (!open) { setPickerTarget(null); setSearchTerm(""); setExpandedFeatId(null); } }}>
        <DialogContent className="max-w-none w-full h-full m-0 rounded-none flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          {showArchetypeToggle && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filterMode === "archetype" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setFilterMode("archetype")}
              >
                Archetype
              </Button>
              <Button
                size="sm"
                variant={filterMode === "feat" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setFilterMode("feat")}
              >
                Feat
              </Button>
            </div>
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

          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredFeats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No feats found</p>
            ) : (
              filteredFeats.map((feat) => {
                const isExpanded = expandedFeatId === feat.id;
                return (
                  <div
                    key={feat.id}
                    className="rounded border border-border hover:border-primary/50 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFeatId(isExpanded ? null : feat.id)}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-center gap-2">
                        {validatingFeat === feat.id && (
                          <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground truncate">{feat.title}</span>
                        <FeatCategoryBadges categories={feat.categories} />
                        <ChevronDown className={`h-4 w-4 ml-auto shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                      {!isExpanded && feat.description && validatingFeat !== feat.id && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{feat.description}</p>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        {validatingFeat === feat.id && (
                          <p className="text-xs text-primary">Checking prerequisites...</p>
                        )}
                        {feat.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{feat.description}</p>
                        )}
                        {feat.content && (
                          <FeatDetailsDisplay content={feat.content} />
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleFeatSelect(feat.id)}
                          disabled={upsertMutation.isPending || addFreeFeatMutation.isPending || setSubfeatMutation.isPending}
                        >
                          Pick this feat
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CharacterFeatPicker;
