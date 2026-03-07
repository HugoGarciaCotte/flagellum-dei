import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sortTitlesEmojiLast } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Gift, Loader2, WifiOff, ChevronDown } from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  description: string | null;
  content: string | null;
};

type CharacterFeat = {
  id: string;
  character_id: string;
  level: number;
  feat_id: string;
  is_free: boolean;
};

const MAX_LEVEL = 10;

type PickerTarget =
  | { type: "level"; level: number }
  | { type: "free" };

const CharacterFeatPicker = ({ characterId, mode = "player", scenarioLevel }: CharacterFeatPickerProps) => {
  const queryClient = useQueryClient();
  const online = useNetworkStatus();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"archetype" | "feat">("feat");
  const [validatingFeat, setValidatingFeat] = useState<string | null>(null);
  const [expandedFeatId, setExpandedFeatId] = useState<string | null>(null);
  const [expandedAssignedFeatId, setExpandedAssignedFeatId] = useState<string | null>(null);

  const { data: allFeats } = useQuery({
    queryKey: ["all-feats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feats")
        .select("id, title, categories, description, content")
        .order("title");
      if (error) throw error;
      return data as Feat[];
    },
    placeholderData: () => getCachedFeats() as Feat[] | undefined ?? undefined,
  });

  // Cache feats on successful fetch
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

  // Cache character feats on successful fetch
  useEffect(() => {
    if (characterFeats && online) {
      cacheCharacterFeats(characterId, characterFeats);
    }
  }, [characterFeats, characterId, online]);

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
      const { error } = await supabase
        .from("character_feats")
        .insert({ character_id: characterId, level, feat_id: featId, is_free: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
      setPickerTarget(null);
      setSearchTerm("");
    },
    onError: (error) => {
      toast.error(error.message || "Could not acquire feat");
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
    },
  });

  const addFreeFeatMutation = useMutation({
    mutationFn: async (featId: string) => {
      const { error } = await supabase
        .from("character_feats")
        .insert({ character_id: characterId, level: 0, feat_id: featId, is_free: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
      setPickerTarget(null);
      setSearchTerm("");
    },
  });

  const featMap = useMemo(() => {
    const map = new Map<string, Feat>();
    (allFeats ?? []).forEach((f) => map.set(f.id, f));
    return map;
  }, [allFeats]);

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

    if (pickerTarget?.type === "free" || mode === "gm") {
      filtered = [...allFeats];
    } else if (filterMode === "archetype") {
      filtered = allFeats.filter((f) => f.categories?.includes("Archetype"));
    } else {
      filtered = allFeats.filter(
        (f) =>
          (f.categories?.includes("General Feat") || f.categories?.includes("Prowess")) &&
          !f.categories?.includes("Hidden Feat")
      );
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((f) => f.title.toLowerCase().includes(lower));
    }
    return filtered.sort(sortTitlesEmojiLast);
  }, [allFeats, filterMode, searchTerm, mode, pickerTarget]);

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
    } else {
      addFreeFeatMutation.mutate(featId);
    }
  };

  const dialogTitle = pickerTarget?.type === "level"
    ? `Choose Feat — Level ${pickerTarget.level}`
    : "Add Free Feat";

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
                  {expandedAssignedFeatId === assigned!.id && (
                    <div className="mt-2 space-y-1">
                      {assignedFeat.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{assignedFeat.description}</p>
                      )}
                      {assignedFeat.content && (
                        <p className="text-xs text-muted-foreground/80 whitespace-pre-line border-t border-border pt-1 mt-1">{assignedFeat.content}</p>
                      )}
                    </div>
                  )}
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
                {expandedAssignedFeatId === cf.id && (
                  <div className="mt-2 space-y-1">
                    {feat.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{feat.description}</p>
                    )}
                    {feat.content && (
                      <p className="text-xs text-muted-foreground/80 whitespace-pre-line border-t border-border pt-1 mt-1">{feat.content}</p>
                    )}
                  </div>
                )}
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
                          <p className="text-xs text-muted-foreground/80 whitespace-pre-line border-t border-border pt-1 mt-1">{feat.content}</p>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleFeatSelect(feat.id)}
                          disabled={upsertMutation.isPending || addFreeFeatMutation.isPending}
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
