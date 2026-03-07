import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, ChevronDown } from "lucide-react";
import FeatCategoryBadges from "@/components/FeatCategoryBadges";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CharacterFeatPickerProps {
  characterId: string;
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
};

const MAX_LEVEL = 10;

const CharacterFeatPicker = ({ characterId }: CharacterFeatPickerProps) => {
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"archetype" | "feat">("feat");

  // Fetch all feats
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

  // Fetch character's assigned feats
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

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async ({ level, featId }: { level: number; featId: string }) => {
      // Delete existing then insert (upsert on unique constraint)
      await supabase
        .from("character_feats")
        .delete()
        .eq("character_id", characterId)
        .eq("level", level);
      const { error } = await supabase
        .from("character_feats")
        .insert({ character_id: characterId, level, feat_id: featId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
      setEditingLevel(null);
      setSearchTerm("");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (level: number) => {
      const { error } = await supabase
        .from("character_feats")
        .delete()
        .eq("character_id", characterId)
        .eq("level", level);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-feats", characterId] });
    },
  });

  // Build feat lookup
  const featMap = useMemo(() => {
    const map = new Map<string, Feat>();
    (allFeats ?? []).forEach((f) => map.set(f.id, f));
    return map;
  }, [allFeats]);

  // Check if archetype already assigned (at any level)
  const hasArchetype = useMemo(() => {
    if (!characterFeats) return false;
    return characterFeats.some((cf) => {
      const feat = featMap.get(cf.feat_id);
      return feat?.categories?.includes("Archetype");
    });
  }, [characterFeats, featMap]);

  // Find archetype level (if editing that level, allow changing)
  const archetypeLevel = useMemo(() => {
    if (!characterFeats) return null;
    const cf = characterFeats.find((cf) => {
      const feat = featMap.get(cf.feat_id);
      return feat?.categories?.includes("Archetype");
    });
    return cf?.level ?? null;
  }, [characterFeats, featMap]);

  // Determine how many levels to show
  const maxFilledLevel = useMemo(() => {
    if (!characterFeats || characterFeats.length === 0) return 0;
    return Math.max(...characterFeats.map((cf) => cf.level));
  }, [characterFeats]);

  const levelsToShow = Math.min(Math.max(maxFilledLevel + 1, 1), MAX_LEVEL);

  // Filter feats for the selector
  const filteredFeats = useMemo(() => {
    if (!allFeats) return [];
    let filtered: Feat[];

    if (filterMode === "archetype") {
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
  }, [allFeats, filterMode, searchTerm]);

  // Can show archetype option for a given level?
  const canPickArchetype = (level: number) => {
    if (!hasArchetype) return true;
    return archetypeLevel === level; // can re-pick if editing the archetype level
  };

  const openSelector = (level: number) => {
    setEditingLevel(level);
    setSearchTerm("");
    // Default to archetype if available, otherwise feat
    setFilterMode(canPickArchetype(level) ? "archetype" : "feat");
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Feats per Level</p>
      {Array.from({ length: levelsToShow }, (_, i) => i + 1).map((level) => {
        const assigned = characterFeats?.find((cf) => cf.level === level);
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
                  <span className="text-sm font-medium text-foreground truncate">
                    {assignedFeat.title}
                  </span>
                  <FeatCategoryBadges categories={assignedFeat.categories} />
                  <div className="ml-auto flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => openSelector(level)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-destructive"
                      onClick={() => deleteMutation.mutate(level)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : !isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => openSelector(level)}
                >
                  + Choose feat
                </Button>
              ) : null}
            </div>

            {isEditing && (
              <div className="mt-2 space-y-2">
                {/* Mode toggle */}
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs ml-auto"
                    onClick={() => setEditingLevel(null)}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search feats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-7 text-xs"
                  />
                </div>

                {/* Feat list */}
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
    </div>
  );
};

export default CharacterFeatPicker;
