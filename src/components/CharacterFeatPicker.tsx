import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sortTitlesEmojiLast } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Loader2, WifiOff, Pencil, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import FeatListItem from "@/components/FeatListItem";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { type SubfeatSlot } from "@/lib/parseEmbeddedFeatMeta";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineQuery } from "@/hooks/useOfflineQuery";
import { queueAction, setCacheData, getCacheData } from "@/lib/offlineQueue";
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
  const queryClient = useQueryClient();
  const online = useNetworkStatus();
  const { isGuest } = useAuth();
  const effectivelyOffline = !online || isGuest;
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // COMMENTED OUT: preprocessed fields — filterMode for archetype toggle
  // const [filterMode, setFilterMode] = useState<"archetype" | "feat">("feat");
  
  const [expandedFeatId, setExpandedFeatId] = useState<string | null>(null);
  const [expandedAssignedFeatId, setExpandedAssignedFeatId] = useState<string | null>(null);
  const [expandedSubfeatKey, setExpandedSubfeatKey] = useState<string | null>(null);

  // COMMENTED OUT: preprocessed fields — speciality state
  // const [localSpecialities, setLocalSpecialities] = useState<Record<string, string>>({});
  // const [specialitiesInitialized, setSpecialitiesInitialized] = useState(false);

  // COMMENTED OUT: preprocessed fields — pending subfeat slots queue
  // const [pendingSubfeatSlots, setPendingSubfeatSlots] = useState<{ characterFeatId: string; slot: SubfeatSlot }[]>([]);

  // AI validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>(null);

  const allFeats = useMemo(() => getAllFeats() as Feat[], []);

  // Metadata map: unified accessor for feat metadata
  const metaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getFeatMeta>>();
    (allFeats ?? []).forEach((f) => {
      map.set(f.id, getFeatMeta(f));
    });
    return map;
  }, [allFeats]);

  // Description map: feat ID → one-liner description from parseable fields
  const descriptionMap = useMemo(() => {
    const map = new Map<string, string>();
    metaMap.forEach((meta, id) => {
      if (meta.description) map.set(id, meta.description);
    });
    return map;
  }, [metaMap]);

  const { data: characterFeats } = useOfflineQuery<CharacterFeat[]>(`character-feats-${characterId}`, {
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
  });

  const { data: characterSubfeats } = useOfflineQuery<CharacterFeatSubfeat[]>(`character-feat-subfeats-${characterId}`, {
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

  // COMMENTED OUT: preprocessed fields — validateFeatLocally
  // const validateFeatLocally = (featId: string) => {
  //   const meta = metaMap.get(featId);
  //   if (!meta) return;
  //   if (meta.blocking && meta.blocking.length > 0) {
  //     const ownedTitles = new Set(
  //       (characterFeats ?? []).map(cf => featMap.get(cf.feat_id)?.title).filter(Boolean)
  //     );
  //     const conflict = meta.blocking.find(b => ownedTitles.has(b));
  //     if (conflict) {
  //       throw new Error(`Blocked: incompatible with "${conflict}" which the character already has`);
  //     }
  //   }
  //   const targetTitle = featMap.get(featId)?.title;
  //   if (targetTitle) {
  //     for (const cf of characterFeats ?? []) {
  //       const cfMeta = metaMap.get(cf.feat_id);
  //       if (cfMeta?.blocking?.includes(targetTitle)) {
  //         const blockerTitle = featMap.get(cf.feat_id)?.title ?? "an owned feat";
  //         throw new Error(`Blocked: "${blockerTitle}" is incompatible with this feat`);
  //       }
  //     }
  //   }
  //   if (!meta.prerequisites) return;
  //   const prereqStr = meta.prerequisites;
  //   const bracketMatches = [...prereqStr.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
  //   if (bracketMatches.length === 0) return;
  //   const ownedTitles = new Set(
  //     (characterFeats ?? []).map(cf => featMap.get(cf.feat_id)?.title).filter(Boolean)
  //   );
  //   const missing = bracketMatches.filter(title => !ownedTitles.has(title));
  //   if (missing.length > 0) {
  //     throw new Error(`Missing prerequisites: ${missing.join(", ")}`);
  //   }
  // };

  // AI validation helper
  const validateWithAI = async (
    featId: string,
    action: () => void,
    pickType: "level" | "free" | "subfeat",
    level?: number | null,
    parentFeatTitle?: string | null,
  ) => {
    if (effectivelyOffline) {
      action();
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("validate-feat", {
        body: { characterId, featId, pickType, level: level ?? null, parentFeatTitle: parentFeatTitle ?? null },
      });
      if (error) {
        console.error("AI validation error:", error);
        // On error, allow anyway
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

  const upsertMutation = useMutation({
    mutationFn: async ({ level, featId }: { level: number; featId: string }) => {
      if (effectivelyOffline) {
        const tempId = crypto.randomUUID();
        // Queue delete + insert
        queueAction({
          table: "character_feats",
          operation: "delete",
          payload: {},
          filter: { character_id: characterId, level, is_free: false },
        });
        queueAction({
          table: "character_feats",
          operation: "insert",
          payload: { character_id: characterId, level, feat_id: featId, is_free: false },
          tempId,
        });
        // Optimistic update
        queryClient.setQueryData(["character-feats", characterId], (old: CharacterFeat[] | undefined) => {
          const filtered = (old ?? []).filter(cf => !(cf.level === level && !cf.is_free));
          return [...filtered, { id: tempId, character_id: characterId, level, feat_id: featId, is_free: false, note: null }];
        });
        return;
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

      // Auto-insert fixed subfeats from metadata for archetypes
      const meta = metaMap.get(featId);
      if (meta?.subfeats && inserted) {
        const fixedSlots = meta.subfeats.filter(s => s.kind === "fixed" && s.feat_title);
        for (const slot of fixedSlots) {
          const subfeat = featByTitle.get(slot.feat_title!);
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
    onSuccess: () => {
      if (!effectivelyOffline) {
        queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
        queryClient.invalidateQueries({ queryKey: ["character-feat-subfeats", characterId] });
        queryClient.invalidateQueries({ queryKey: ["character-feats-summary", characterId] });
      }
      setPickerTarget(null);
      setSearchTerm("");
    },
    onError: (error: any) => {
      toast.error("Cannot pick this feat", {
        description: error.message || "An error occurred",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ level, isFree, id }: { level: number; isFree: boolean; id?: string }) => {
      if (effectivelyOffline) {
        if (isFree && id) {
          queueAction({ table: "character_feats", operation: "delete", payload: {}, filter: { id } });
          queryClient.setQueryData(["character-feats", characterId], (old: CharacterFeat[] | undefined) =>
            (old ?? []).filter(cf => cf.id !== id)
          );
        } else {
          queueAction({ table: "character_feats", operation: "delete", payload: {}, filter: { character_id: characterId, level, is_free: false } });
          queryClient.setQueryData(["character-feats", characterId], (old: CharacterFeat[] | undefined) =>
            (old ?? []).filter(cf => !(cf.level === level && !cf.is_free))
          );
        }
        return;
      }
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
      if (!effectivelyOffline) {
        queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
        queryClient.invalidateQueries({ queryKey: ["character-feat-subfeats", characterId] });
        queryClient.invalidateQueries({ queryKey: ["character-feats-summary", characterId] });
      }
    },
  });

  const addFreeFeatMutation = useMutation({
    mutationFn: async (featId: string) => {
      if (effectivelyOffline) {
        const tempId = crypto.randomUUID();
        queueAction({
          table: "character_feats",
          operation: "insert",
          payload: { character_id: characterId, level: 0, feat_id: featId, is_free: true },
          tempId,
        });
        queryClient.setQueryData(["character-feats", characterId], (old: CharacterFeat[] | undefined) =>
          [...(old ?? []), { id: tempId, character_id: characterId, level: 0, feat_id: featId, is_free: true, note: null }]
        );
        return;
      }
      const { error } = await supabase
        .from("character_feats")
        .insert({ character_id: characterId, level: 0, feat_id: featId, is_free: true });
      if (error) throw error;
    },
    onSuccess: () => {
      if (!effectivelyOffline) {
        queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
        queryClient.invalidateQueries({ queryKey: ["character-feats-summary", characterId] });
      }
      setPickerTarget(null);
      setSearchTerm("");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const trimmed = note.trim() || null;
      if (!online) {
        queueAction({ table: "character_feats", operation: "update", payload: { note: trimmed }, filter: { id } });
        queryClient.setQueryData(["character-feats", characterId], (old: CharacterFeat[] | undefined) =>
          (old ?? []).map(cf => cf.id === id ? { ...cf, note: trimmed } : cf)
        );
        return;
      }
      const { error } = await supabase
        .from("character_feats")
        .update({ note: trimmed } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
        queryClient.invalidateQueries({ queryKey: ["character-feats-summary", characterId] });
      }
    },
  });

  const setSubfeatMutation = useMutation({
    mutationFn: async ({ characterFeatId, slot, subfeatId }: { characterFeatId: string; slot: number; subfeatId: string | null }) => {
      if (!online) {
        queueAction({ table: "character_feat_subfeats", operation: "delete", payload: {}, filter: { character_feat_id: characterFeatId, slot } });
        if (subfeatId) {
          const tempId = crypto.randomUUID();
          queueAction({
            table: "character_feat_subfeats",
            operation: "insert",
            payload: { character_feat_id: characterFeatId, slot, subfeat_id: subfeatId },
            tempId,
          });
          queryClient.setQueryData(["character-feat-subfeats", characterId], (old: CharacterFeatSubfeat[] | undefined) => {
            const filtered = (old ?? []).filter(cs => !(cs.character_feat_id === characterFeatId && cs.slot === slot));
            return [...filtered, { id: tempId, character_feat_id: characterFeatId, slot, subfeat_id: subfeatId }];
          });
        } else {
          queryClient.setQueryData(["character-feat-subfeats", characterId], (old: CharacterFeatSubfeat[] | undefined) =>
            (old ?? []).filter(cs => !(cs.character_feat_id === characterFeatId && cs.slot === slot))
          );
        }
        return;
      }
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
      if (online) {
        queryClient.invalidateQueries({ queryKey: ["character-feat-subfeats", characterId] });
      }
      setPickerTarget(null);
      setSearchTerm("");
    },
  });

  // COMMENTED OUT: preprocessed fields — speciality initialization
  // useEffect(() => {
  //   if (characterFeats && !specialitiesInitialized) {
  //     const specs: Record<string, string> = {};
  //     characterFeats.forEach(cf => { specs[cf.id] = cf.note ?? ""; });
  //     setLocalSpecialities(specs);
  //     setSpecialitiesInitialized(true);
  //   }
  // }, [characterFeats, specialitiesInitialized]);

  // useEffect(() => {
  //   if (characterFeats) {
  //     setLocalSpecialities(prev => {
  //       const next = { ...prev };
  //       characterFeats.forEach(cf => {
  //         if (!(cf.id in next)) next[cf.id] = cf.note ?? "";
  //       });
  //       return next;
  //     });
  //   }
  // }, [characterFeats]);

  // const handleSpecialityChange = (cfId: string, value: string) => {
  //   setLocalSpecialities(prev => ({ ...prev, [cfId]: value }));
  //   updateNoteMutation.mutate({ id: cfId, note: value });
  // };

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

  // Helper: is this feat an archetype?
  const isArchetype = (feat: Feat) => feat.categories?.includes("Archetype");

  // Helper: get subfeat count for a character feat
  const getSubfeatCount = (cfId: string) => (subfeatMap.get(cfId) || []).length;

  // Helper: get default subfeat slots to show (archetype = 3, others = 0)
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
      // COMMENTED OUT: preprocessed fields — archetype toggle and unlocked categories
      // if (filterMode === "archetype") {
      //   filtered = allFeats.filter((f) => f.categories?.includes("Archetype"));
      // } else {
      //   const unlockedCategories = new Set<string>();
      //   for (const cf of characterFeats ?? []) {
      //     const meta = metaMap.get(cf.feat_id);
      //     if (meta?.unlocks_categories) {
      //       meta.unlocks_categories.forEach((c: string) => unlockedCategories.add(c));
      //     }
      //   }
      //   filtered = allFeats.filter(...);
      // }

      // Simplified: show all feats except hidden ones
      filtered = allFeats.filter(
        (f) => !f.categories?.includes("Hidden Feat")
      );
    }

    // Hide General Feats already owned by the character
    const ownedFeatIds = new Set((characterFeats ?? []).map(cf => cf.feat_id));
    filtered = filtered.filter(f => {
      if (f.categories?.includes("General Feat") && ownedFeatIds.has(f.id)) return false;
      return true;
    });

    // Hide other Archetypes if character already has one
    const hasArchetype = (characterFeats ?? []).some(cf => {
      const feat = featMap.get(cf.feat_id);
      return feat && isArchetype(feat);
    });
    if (hasArchetype) {
      filtered = filtered.filter(f => !isArchetype(f) || ownedFeatIds.has(f.id));
    }

    // COMMENTED OUT: preprocessed fields — blocking filter
    // const ownedFeatTitles = new Set(...);
    // filtered = filtered.filter(f => {
    //   for (const cf of characterFeats ?? []) {
    //     const ownedMeta = metaMap.get(cf.feat_id);
    //     if (ownedMeta?.blocking?.includes(f.title)) return false;
    //   }
    //   const thisMeta = metaMap.get(f.id);
    //   if (thisMeta?.blocking?.some(b => ownedFeatTitles.has(b))) return false;
    //   return true;
    // });

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
        upsertMutation.mutate({ level: pickerTarget.level, featId });
      } else if (pickerTarget.type === "free") {
        addFreeFeatMutation.mutate(featId);
      } else if (pickerTarget.type === "subfeat") {
        setSubfeatMutation.mutate({
          characterFeatId: pickerTarget.characterFeatId,
          slot: pickerTarget.slot,
          subfeatId: featId,
        });
      }
    };

    // Build context for AI validation
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
    ? `Choose Feat — Level ${pickerTarget.level}`
    : pickerTarget?.type === "subfeat"
    ? `Choose Subfeat`
    : "Add Free Feat";

  // Subfeat rendering: uses metadata slots for archetypes when available
  const renderSubfeats = (cf: CharacterFeat, feat: Feat) => {
    const subs = subfeatMap.get(cf.id) || [];
    const meta = isArchetype(feat) ? metaMap.get(cf.feat_id) : null;
    const metaSlots = meta?.subfeats ?? null;
    const currentCount = subs.length;

    // Build slot list from metadata if available, otherwise fall back to defaults
    const slotNumbers: number[] = [];
    const subsBySlot = new Map<number, CharacterFeatSubfeat>();
    const slotMetaByNum = new Map<number, SubfeatSlot>();
    subs.forEach(s => {
      subsBySlot.set(s.slot, s);
      slotNumbers.push(s.slot);
    });

    if (metaSlots) {
      // Use metadata-defined slots
      metaSlots.forEach(s => {
        slotMetaByNum.set(s.slot, s);
        if (!slotNumbers.includes(s.slot)) slotNumbers.push(s.slot);
      });
    } else {
      // Fallback: default empty slots for archetypes
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
                    actions={online ? (
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
                          onClick={() => setSubfeatMutation.mutate({ characterFeatId: cf.id, slot: slotNum, subfeatId: null })}
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

          // Empty slot
          return (
            <div key={slotNum} className="flex items-center gap-2 text-xs ml-1">
              <span className="text-muted-foreground">↳</span>
              {online ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs text-muted-foreground"
                  onClick={() => openPicker({ type: "subfeat", characterFeatId: cf.id, slot: slotNum, slotMeta: slotMetaByNum.get(slotNum) })}
                >
                  + Choose subfeat
                </Button>
              ) : (
                <span className="text-muted-foreground italic">—</span>
              )}
            </div>
          );
        })}

        {/* + button to add more subfeat slots */}
        {canAddMore && online && (
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

        {/* COMMENTED OUT: preprocessed fields — archetype toggle */}
        {/* {showArchetypeToggle && (
          <div className="flex gap-1">
            <Button size="sm" variant={filterMode === "archetype" ? "default" : "outline"} ...>Archetype</Button>
            <Button size="sm" variant={filterMode === "feat" ? "default" : "outline"} ...>Feat</Button>
          </div>
        )} */}

        {/* AI validation denied alert */}
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
        {!online && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <WifiOff className="h-3 w-3" /> Offline — changes saved locally
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
                   <FeatListItem
                    feat={{ ...assignedFeat, description: descriptionMap.get(assignedFeat.id) ?? undefined }}
                    expanded={expandedAssignedFeatId === assigned!.id}
                    onToggleExpand={() => setExpandedAssignedFeatId(expandedAssignedFeatId === assigned!.id ? null : assigned!.id)}
                    // COMMENTED OUT: preprocessed fields — specialities
                    // specialities={assignedMeta?.specialities}
                    // specialityValue={localSpecialities[assigned!.id] ?? assigned!.note ?? ""}
                    // onSpecialityChange={online ? (v) => handleSpecialityChange(assigned!.id, v) : undefined}
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
                // COMMENTED OUT: preprocessed fields — specialities
                // specialities={meta?.specialities}
                // specialityValue={localSpecialities[cf.id] ?? cf.note ?? ""}
                // onSpecialityChange={online ? (v) => handleSpecialityChange(cf.id, v) : undefined}
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
