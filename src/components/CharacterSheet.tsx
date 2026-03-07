import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import CharacterFeatPicker from "@/components/CharacterFeatPicker";

interface CharacterSheetProps {
  characterId: string;
  mode?: "player" | "gm";
  scenarioLevel?: number;
  onDone?: () => void;
}

const CharacterSheet = ({ characterId, mode = "player", scenarioLevel, onDone }: CharacterSheetProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [dirty, setDirty] = useState(false);

  const { data: character } = useQuery({
    queryKey: ["character", characterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!characterId,
  });

  // Sync form when character data loads
  useEffect(() => {
    if (character) {
      setName(character.name);
      setDesc(character.description || "");
      setDirty(false);
    }
  }, [character]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("characters")
        .update({ name, description: desc || null })
        .eq("id", characterId);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["character", characterId] });
      queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      queryClient.invalidateQueries({ queryKey: ["gm-players"] });
      queryClient.invalidateQueries({ queryKey: ["game-characters"] });
      toast({ title: "Character updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleNameChange = (val: string) => { setName(val); setDirty(true); };
  const handleDescChange = (val: string) => { setDesc(val); setDirty(true); };

  if (!character) {
    return <div className="text-sm text-muted-foreground py-4 text-center">Loading character...</div>;
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Character name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
      />
      <Textarea
        placeholder="Description (optional)"
        value={desc}
        onChange={(e) => handleDescChange(e.target.value)}
        rows={3}
      />
      {dirty && (
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          className="w-full font-display"
        >
          Save Changes
        </Button>
      )}

      <CharacterFeatPicker
        characterId={characterId}
        mode={mode}
        scenarioLevel={scenarioLevel}
      />

      {onDone && (
        <Button
          variant="outline"
          className="w-full font-display"
          onClick={onDone}
        >
          Done
        </Button>
      )}
    </div>
  );
};

export default CharacterSheet;
