import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Gift, Loader2 } from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import { toast } from "sonner";

interface CharacterFeatPickerProps {
  characterId: string;
  mode?: "player" | "gm";
}

type Feat = {
  id: string;
  title: string;
  categories: string[];
  description: string | null;
};

type CharacterFeat = {
  id: string;
  character_id: string;
  level: number;
  feat_id: string;
  is_free: boolean;
};

const MAX_LEVEL = 10;

const CharacterFeatPicker = ({ characterId, mode = "player" }: CharacterFeatPickerProps) => {
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"archetype" | "feat">("feat");
  const [addingFree, setAddingFree] = useState(false);
  const [freeSearch, setFreeSearch] = useState("");
  const [validatingFeat, setValidatingFeat] = useState<string | null>(null);

  const { data: allFeats } = useQuery({
    queryKey: ["all-feats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feats")
        .select("id, title, categories, description")
        .order("title");
      if (error) throw error;
      return data as Feat[];
    },
  });

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
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ level, featId }: { level: number; featId: string }) => {
      // Validate prerequisites in player mode
      if (mode === "player") {
        setValidatingFeat(featId);
        try {
          const { data, error } = await supabase.functions.invoke("validate-feat", {
            body: { characterId, featId },
          });
          if (error) {
            console.error("Validation error:", error);
            // Fail open on network errors
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
      setEditingLevel(null);
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
      setFreeSearch("");
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

  const filteredFeats = useMemo(() => {
    if (!allFeats) return [];
    let filtered: Feat[];

    if (mode === "gm") {
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
    return filtered;
  }, [allFeats, filterMode, searchTerm, mode]);

  const filteredFreeFeats = useMemo(() => {
    if (!allFeats) return [];
    let filtered = [...allFeats];
    if (freeSearch.trim()) {
      const lower = freeSearch.toLowerCase();
      filtered = filtered.filter((f) => f.title.toLowerCase().includes(lower));
    }
    return filtered;
  }, [allFeats, freeSearch]);

  const canPickArchetype = (level: number) => {
    if (mode === "gm") return false; // GM sees all feats, no archetype toggle needed
    if (!hasArchetype) return true;
    return archetypeLevel === level;
  };

  const openSelector = (level: number) => {
    setEditingLevel(level);
    setSearchTerm("");
    if (mode === "gm") {
      setFilterMode("feat");
    } else {
      setFilterMode(canPickArchetype(level) ? "archetype" : "feat");
    }
  };

  return (
    <div className="space-y-2">
      {/* Level-based feats */}
      <p className="text-sm font-medium text-muted-foreground">Feats per Level</p>
      {Array.from({ length: levelsToShow }, (_, i) => i + 1).map((level) => {
        const assigned = levelFeats.find((cf) => cf.level === level);
        const assignedFeat = assigned ? featMap.get(assigned.feat_id) : null;
        const isEditing = editingLevel === level;

        return (
          <div key={level} className="border border-border rounded-md p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-primary/10 text-primary rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                {level}
              </span>

              {!isEditing && assignedFeat ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{assignedFeat.title}</span>
                  <FeatCategoryBadges categories={assignedFeat.categories} />
                  <div className="ml-auto flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openSelector(level)}>
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
                </div>
              ) : !isEditing ? (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => openSelector(level)}>
                  + Choose feat
                </Button>
              ) : null}
            </div>

            {isEditing && (
              <div className="mt-2 space-y-2">
                {mode === "player" && (
                  <div className="flex gap-1">
                    {canPickArchetype(level) && (
                      <Button
                        size="sm"
                        variant={filterMode === "archetype" ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setFilterMode("archetype")}
                      >
                        Archetype
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={filterMode === "feat" ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setFilterMode("feat")}
                    >
                      Feat
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setEditingLevel(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
                {mode === "gm" && (
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingLevel(null)}>
                      Cancel
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search feats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-7 text-xs"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredFeats.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No feats found</p>
                  ) : (
                    filteredFeats.map((feat) => (
                      <button
                        key={feat.id}
                        onClick={() => upsertMutation.mutate({ level, featId: feat.id })}
                        className="w-full text-left p-2 rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        disabled={upsertMutation.isPending}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{feat.title}</span>
                          <FeatCategoryBadges categories={feat.categories} />
                        </div>
                        {feat.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{feat.description}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Free Feats Section */}
      {(freeFeats.length > 0 || mode === "gm") && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Gift className="h-4 w-4" /> Free Feats
          </p>

          {freeFeats.length === 0 && mode === "gm" && !addingFree && (
            <p className="text-xs text-muted-foreground italic">No free feats granted yet.</p>
          )}

          {freeFeats.map((cf) => {
            const feat = featMap.get(cf.feat_id);
            if (!feat) return null;
            return (
              <div key={cf.id} className="flex items-center gap-2 border border-border rounded-md p-2">
                <span className="text-sm font-medium text-foreground truncate">{feat.title}</span>
                <FeatCategoryBadges categories={feat.categories} />
                {mode === "gm" && (
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
            );
          })}

          {mode === "gm" && !addingFree && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setAddingFree(true)}>
              + Add free feat
            </Button>
          )}

          {mode === "gm" && addingFree && (
            <div className="space-y-2 border border-border rounded-md p-3">
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingFree(false); setFreeSearch(""); }}>
                  Cancel
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search all feats..."
                  value={freeSearch}
                  onChange={(e) => setFreeSearch(e.target.value)}
                  className="h-8 pl-7 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredFreeFeats.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No feats found</p>
                ) : (
                  filteredFreeFeats.map((feat) => (
                    <button
                      key={feat.id}
                      onClick={() => addFreeFeatMutation.mutate(feat.id)}
                      className="w-full text-left p-2 rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      disabled={addFreeFeatMutation.isPending}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{feat.title}</span>
                        <FeatCategoryBadges categories={feat.categories} />
                      </div>
                      {feat.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{feat.description}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterFeatPicker;
