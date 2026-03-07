import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Users, Pencil, Sword } from "lucide-react";
import CharacterSheet from "@/components/CharacterSheet";

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
  const [editingId, setEditingId] = useState<string | null>(null);

  const charMap = new Map(characters.map((c) => [c.id, c]));

  const startEdit = (char: Character) => {
    setEditingId(char.id);
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
                      <div className="bg-muted/30 rounded-md p-2">
                        <CharacterSheet characterId={char.id} mode="gm" onDone={cancelEdit} />
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
