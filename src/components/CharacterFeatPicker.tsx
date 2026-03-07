import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sortTitlesEmojiLast } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Gift, Loader2, WifiOff, Pencil, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import FeatListItem from "@/components/FeatListItem";
import { parseEmbeddedFeatMeta, type SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";

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
  
  const [expandedFeatId, setExpandedFeatId] = useState<string | null>(null);
  const [expandedAssignedFeatId, setExpandedAssignedFeatId] = useState<string | null>(null);
  const [expandedSubfeatKey, setExpandedSubfeatKey] = useState<string | null>(null);
  const [localSpecialities, setLocalSpecialities] = useState<Record<string, string>>({});
  const [specialitiesInitialized, setSpecialitiesInitialized] = useState(false);
  const [pendingSubfeatSlots, setPendingSubfeatSlots] = useState<{ characterFeatId: string; slot: SubfeatSlot }[]>([]);

  const { data: allFeats } = useQuery({
    queryKey: ["all-feats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feats")
        .select("id, title, categories, content, raw_content")
        .order("title");
      if (error) throw error;
      return data as Feat[];
    },
    placeholderData: () => getCachedFeats() as Feat[] | undefined ?? undefined,
  });

  useEffect(() => {
    if (allFeats && allFeats.length > 0 && online) {
      cacheFeats(allFeats);
    }
  }, [allFeats, online]);

  // Parse metadata from content for all feats
  const metaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseEmbeddedFeatMeta>>();
    (allFeats ?? []).forEach((f) => map.set(f.id, parseEmbeddedFeatMeta(f.raw_content || f.content)));
    return map;
  }, [allFeats]);

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

  // Programmatic prerequisite & blocking validation (no AI)
  const validateFeatLocally = (featId: string) => {
    const meta = metaMap.get(featId);
    if (!meta) return;

    // Check blocking (safety net — picker already filters these)
    if (meta.blocking && meta.blocking.length > 0) {
      const ownedTitles = new Set(
        (characterFeats ?? []).map(cf => featMap.get(cf.feat_id)?.title).filter(Boolean)
      );
      const conflict = meta.blocking.find(b => ownedTitles.has(b));
      if (conflict) {
        throw new Error(`Blocked: incompatible with "${conflict}" which the character already has`);
      }
    }

    // Check if any owned feat blocks this one
    const targetTitle = featMap.get(featId)?.title;
    if (targetTitle) {
      for (const cf of characterFeats ?? []) {
        const cfMeta = metaMap.get(cf.feat_id);
        if (cfMeta?.blocking?.includes(targetTitle)) {
          const blockerTitle = featMap.get(cf.feat_id)?.title ?? "an owned feat";
          throw new Error(`Blocked: "${blockerTitle}" is incompatible with this feat`);
        }
      }
    }

    // Check prerequisites
    if (!meta.prerequisites) return;

    const prereqStr = meta.prerequisites;
    // Extract feat titles in square brackets like [Prowess A]
    const bracketMatches = [...prereqStr.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
    if (bracketMatches.length === 0) return; // No parseable prerequisites

    const ownedTitles = new Set(
      (characterFeats ?? []).map(cf => featMap.get(cf.feat_id)?.title).filter(Boolean)
    );

    const missing = bracketMatches.filter(title => !ownedTitles.has(title));
    if (missing.length > 0) {
      throw new Error(`Missing prerequisites: ${missing.join(", ")}`);
    }
  };

  const upsertMutation = useMutation({
    mutationFn: async ({ level, featId }: { level: number; featId: string }) => {
      if (mode === "player") {
        validateFeatLocally(featId);
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
      const meta = metaMap.get(featId);
      if (meta?.subfeats && inserted) {
        const fixedSlots = meta.subfeats.filter(s => s.kind === "fixed" && s.feat_title);
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

      const meta = metaMap.get(variables.featId);
      const nonFixedSlots = (meta?.subfeats ?? []).filter(s => s.kind !== "fixed");
      if (nonFixedSlots.length > 0) {
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
    onError: (error: any) => {
      toast.error("Cannot pick this feat", {
        description: error.message || "Prerequisites not met",
      });
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

      const meta = metaMap.get(featId);
      const nonFixedSlots = (meta?.subfeats ?? []).filter(s => s.kind !== "fixed");
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
    },
  });

  const setSubfeatMutation = useMutation({
    mutationFn: async ({ characterFeatId, slot, subfeatId }: { characterFeatId: string; slot: number; subfeatId: string | null }) => {
      await supabase.from("character_feat_subfeats")
        .delete()
        .eq("character_feat_id", characterFeatId)
        .eq("slot", slot);
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

      if (pendingSubfeatSlots.length > 0) {
        const [next, ...rest] = pendingSubfeatSlots;
        setPendingSubfeatSlots(rest);
        setSearchTerm("");
        setExpandedFeatId(null);
        setPickerTarget({ type: "subfeat", characterFeatId: next.characterFeatId, slot: next.slot });
      } else {
        setPickerTarget(null);
        setSearchTerm("");
      }
    },
  });

  // Initialize local specialities from fetched data
  useEffect(() => {
    if (characterFeats && !specialitiesInitialized) {
      const specs: Record<string, string> = {};
      characterFeats.forEach(cf => { specs[cf.id] = cf.note ?? ""; });
      setLocalSpecialities(specs);
      setSpecialitiesInitialized(true);
    }
  }, [characterFeats, specialitiesInitialized]);

  useEffect(() => {
    if (characterFeats) {
      setLocalSpecialities(prev => {
        const next = { ...prev };
        characterFeats.forEach(cf => {
          if (!(cf.id in next)) next[cf.id] = cf.note ?? "";
        });
        return next;
      });
    }
  }, [characterFeats]);

  const handleSpecialityChange = (cfId: string, value: string) => {
    setLocalSpecialities(prev => ({ ...prev, [cfId]: value }));
    updateNoteMutation.mutate({ id: cfId, note: value });
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
      const slot = pickerTarget.slot;
      if (slot.kind === "list" && slot.options) {
        filtered = allFeats.filter(f => slot.options!.includes(f.title));
      } else if (slot.kind === "type" && slot.filter) {
        const parts = slot.filter.split(",").map(f => f.trim());
        const excludeCategories = parts.filter(p => p.startsWith("not:")).map(p => p.replace("not:", ""));
        const includeCategories = parts.filter(p => !p.startsWith("not:"));
        filtered = allFeats.filter(f => {
          if (excludeCategories.length > 0 && f.categories?.some(c => excludeCategories.includes(c))) return false;
          if (includeCategories.length > 0 && !f.categories?.some(c => includeCategories.includes(c))) return false;
          return true;
        });
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
        const meta = metaMap.get(cf.feat_id);
        if (meta?.unlocks_categories) {
          meta.unlocks_categories.forEach((c: string) => unlockedCategories.add(c));
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

    // Filter out feats blocked by currently owned feats (and vice versa)
    const ownedFeatTitles = new Set(
      (characterFeats ?? []).map(cf => featMap.get(cf.feat_id)?.title).filter(Boolean) as string[]
    );
    filtered = filtered.filter(f => {
      // Check if any owned feat blocks this feat
      for (const cf of characterFeats ?? []) {
        const ownedMeta = metaMap.get(cf.feat_id);
        if (ownedMeta?.blocking?.includes(f.title)) return false;
      }
      // Check if this feat blocks any owned feat
      const thisMeta = metaMap.get(f.id);
      if (thisMeta?.blocking?.some(b => ownedFeatTitles.has(b))) return false;
      return true;
    });

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((f) => f.title.toLowerCase().includes(lower));
    }
    return filtered.sort(sortTitlesEmojiLast);
  }, [allFeats, filterMode, searchTerm, mode, pickerTarget, characterFeats, metaMap]);

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

  const renderSubfeats = (cf: CharacterFeat, feat: Feat) => {
    const meta = metaMap.get(feat.id);
    if (!meta?.subfeats || meta.subfeats.length === 0) return null;
    const subs = subfeatMap.get(cf.id) || [];

    return (
      <div className="ml-4 mt-1 space-y-1">
        {meta.subfeats.map((slot) => {
          const assigned = subs.find(s => s.slot === slot.slot);
          const assignedFeat = assigned ? featMap.get(assigned.subfeat_id) : null;
          const subfeatKey = `${cf.id}-${slot.slot}`;

          if (slot.kind === "fixed") {
            const fixedFeat = assignedFeat || (slot.feat_title ? featByTitle.get(slot.feat_title) : null);
            if (!fixedFeat) {
              return (
                <div key={slot.slot} className="flex items-center gap-2 text-xs border-l-2 border-primary/30 pl-2">
                  <span className="text-muted-foreground">↳</span>
                  <span className="font-medium text-foreground">{slot.feat_title || "—"}</span>
                  <span className="text-muted-foreground italic">(granted)</span>
                </div>
              );
            }
            return (
              <div key={slot.slot} className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">↳</span>
                <div className="flex-1 min-w-0">
                  <FeatListItem
                    feat={{ ...fixedFeat, description: metaMap.get(fixedFeat.id)?.description ?? null }}
                    expanded={expandedSubfeatKey === subfeatKey}
                    onToggleExpand={() => setExpandedSubfeatKey(expandedSubfeatKey === subfeatKey ? null : subfeatKey)}
                    compact
                    actions={<span className="text-xs text-muted-foreground italic">(granted)</span>}
                  />
                </div>
              </div>
            );
          }

          if (slot.kind === "list") {
            const options = slot.options || [];
            const featOptions = options.map(t => featByTitle.get(t)).filter(Boolean) as Feat[];

            if (assignedFeat) {
              return (
                <div key={slot.slot} className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">↳</span>
                  <div className="flex-1 min-w-0">
                    <FeatListItem
                      feat={{ ...assignedFeat, description: metaMap.get(assignedFeat.id)?.description ?? null }}
                      expanded={expandedSubfeatKey === subfeatKey}
                      onToggleExpand={() => setExpandedSubfeatKey(expandedSubfeatKey === subfeatKey ? null : subfeatKey)}
                      compact
                      actions={online ? (
                        <>
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
                            <SelectTrigger className="h-5 w-5 border-0 p-0 [&>svg]:hidden" asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {featOptions.map(f => (
                                <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive"
                            onClick={() => setSubfeatMutation.mutate({ characterFeatId: cf.id, slot: slot.slot, subfeatId: null })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : undefined}
                    />
                  </div>
                </div>
              );
            }
            return (
              <div key={slot.slot} className="flex items-center gap-2 text-xs ml-1">
                <span className="text-muted-foreground">↳</span>
                {online ? (
                  <Select
                    value="__none__"
                    onValueChange={(val) => {
                      setSubfeatMutation.mutate({
                        characterFeatId: cf.id,
                        slot: slot.slot,
                        subfeatId: val === "__none__" ? null : val,
                      });
                    }}
                  >
                    <SelectTrigger className="h-6 text-xs w-auto min-w-[120px]">
                      <SelectValue placeholder="+ Choose subfeat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {featOptions.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </div>
            );
          }

          if (slot.kind === "type") {
            if (assignedFeat) {
              return (
                <div key={slot.slot} className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">↳</span>
                  <div className="flex-1 min-w-0">
                    <FeatListItem
                      feat={{ ...assignedFeat, description: metaMap.get(assignedFeat.id)?.description ?? null }}
                      expanded={expandedSubfeatKey === subfeatKey}
                      onToggleExpand={() => setExpandedSubfeatKey(expandedSubfeatKey === subfeatKey ? null : subfeatKey)}
                      compact
                      actions={online ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => openPicker({ type: "subfeat", characterFeatId: cf.id, slot })}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive"
                            onClick={() => setSubfeatMutation.mutate({ characterFeatId: cf.id, slot: slot.slot, subfeatId: null })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : undefined}
                    />
                  </div>
                </div>
              );
            }
            return (
              <div key={slot.slot} className="flex items-center gap-2 text-xs ml-1">
                <span className="text-muted-foreground">↳</span>
                {online ? (
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

  if (pickerTarget !== null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { setPickerTarget(null); setSearchTerm(""); setExpandedFeatId(null); }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold">{dialogTitle}</p>
        </div>

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

        <div className="max-h-[60vh] overflow-y-auto space-y-1">
          {filteredFeats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No feats found</p>
          ) : (
            filteredFeats.map((feat) => {
              const isExpanded = expandedFeatId === feat.id;
              const meta = metaMap.get(feat.id);
              return (
                <FeatListItem
                  key={feat.id}
                  feat={{ ...feat, description: meta?.description ?? null }}
                  expanded={isExpanded}
                  onToggleExpand={() => setExpandedFeatId(isExpanded ? null : feat.id)}
                  expandedContent={
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleFeatSelect(feat.id)}
                        disabled={upsertMutation.isPending || addFreeFeatMutation.isPending || setSubfeatMutation.isPending}
                      >
                        Pick this feat
                      </Button>
                    </>
                  }
                />
              );
            })
          )}
        </div>
      </div>
    );
  }

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
        const assignedMeta = assignedFeat ? metaMap.get(assignedFeat.id) : null;

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
                    feat={{ ...assignedFeat, description: assignedMeta?.description ?? null }}
                    expanded={expandedAssignedFeatId === assigned!.id}
                    onToggleExpand={() => setExpandedAssignedFeatId(expandedAssignedFeatId === assigned!.id ? null : assigned!.id)}
                    specialities={assignedMeta?.specialities}
                    specialityValue={localSpecialities[assigned!.id] ?? assigned!.note ?? ""}
                    onSpecialityChange={online ? (v) => handleSpecialityChange(assigned!.id, v) : undefined}
                    actions={online ? (
                      <>
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
                      </>
                    ) : undefined}
                    collapsedContent={assigned && assignedFeat ? renderSubfeats(assigned, assignedFeat) : undefined}
                    compact
                  />
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
            const meta = metaMap.get(feat.id);
            return (
              <FeatListItem
                key={cf.id}
                feat={{ ...feat, description: meta?.description ?? null }}
                expanded={expandedAssignedFeatId === cf.id}
                onToggleExpand={() => setExpandedAssignedFeatId(expandedAssignedFeatId === cf.id ? null : cf.id)}
                specialities={meta?.specialities}
                specialityValue={localSpecialities[cf.id] ?? cf.note ?? ""}
                onSpecialityChange={online ? (v) => handleSpecialityChange(cf.id, v) : undefined}
                actions={mode === "gm" && online ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-destructive ml-auto shrink-0"
                    onClick={() => deleteMutation.mutate({ level: 0, isFree: true, id: cf.id })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                ) : undefined}
                collapsedContent={renderSubfeats(cf, feat)}
                compact
              />
            );
          })}

          {mode === "gm" && online && (
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
