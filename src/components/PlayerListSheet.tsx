import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Pencil, Check, X, Sword } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import CharacterFeatPicker from "@/components/CharacterFeatPicker";

interface Player {
  id: string;
  user_id: string;
  character_id: string | null;
  profiles?: { display_name: string | null } | null;
}

interface Character {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
}

interface PlayerListSheetProps {
  players: Player[];
  characters: Character[];
  gameId: string;
}

const PlayerListSheet = ({ players, characters, gameId }: PlayerListSheetProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const charMap = new Map(characters.map((c) => [c.id, c]));

  const updateCharMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string | null }) => {
      const { error } = await supabase
        .from("characters")
        .update({ name, description })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-characters", gameId] });
      setEditingId(null);
      toast({ title: "Character updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startEdit = (char: Character) => {
    setEditingId(char.id);
    setEditName(char.name);
    setEditDesc(char.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer">
          <Users className="h-4 w-4" /> {players.length}
        </button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Players ({players.length})
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No players have joined yet.</p>
          ) : (
            players.map((player) => {
              const char = player.character_id ? charMap.get(player.character_id) : null;
              const displayName = (player as any).profiles?.display_name || "Unknown player";
              const isEditing = editingId === char?.id;

              return (
                <div key={player.id} className="border border-border rounded-lg p-3 space-y-2">
                  <p className="font-display font-semibold text-foreground">{displayName}</p>

                  {char ? (
                    isEditing ? (
                      <div className="space-y-2 bg-muted/30 rounded-md p-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Character name"
                          className="text-sm"
                        />
                        <Textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Description (optional)"
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1"
                            disabled={!editName.trim() || updateCharMutation.isPending}
                            onClick={() => updateCharMutation.mutate({ id: char.id, name: editName, description: editDesc || null })}
                          >
                            <Check className="h-3 w-3" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1">
                            <X className="h-3 w-3" /> Cancel
                          </Button>
                        </div>
                        <CharacterFeatPicker characterId={char.id} mode="gm" />
                      </div>
                    ) : (
                      <div className="flex items-start justify-between bg-muted/30 rounded-md p-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Sword className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-display text-sm font-medium text-foreground">{char.name}</p>
                            {char.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{char.description}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => startEdit(char)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No character selected</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PlayerListSheet;
