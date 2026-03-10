import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pencil, Check } from "lucide-react";
import CharacterSheet from "@/components/CharacterSheet";
import CharacterListItem from "@/components/CharacterListItem";

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

  const cancelEdit = () => setEditingId(null);

  // Group characters by user_id
  const charsByUser = new Map<string, Character[]>();
  for (const c of characters) {
    const list = charsByUser.get(c.user_id) ?? [];
    list.push(c);
    charsByUser.set(c.user_id, list);
  }

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

        <div className="mt-6 space-y-6">
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No players have joined yet.</p>
          ) : (
            players.map((player) => {
              const displayName = (player as any).profiles?.display_name || "Unknown player";
              const playerChars = charsByUser.get(player.user_id) ?? [];
              const selectedCharId = player.character_id;

              return (
                <div key={player.id} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">{displayName}</p>

                  {playerChars.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-1">No characters</p>
                  ) : (
                    playerChars.map((char) => {
                      const isSelected = char.id === selectedCharId;
                      const isEditing = editingId === char.id;

                      if (isEditing) {
                        return (
                          <div key={char.id} className="bg-muted/30 rounded-md p-2">
                            <CharacterSheet characterId={char.id} mode="gm" onDone={cancelEdit} />
                          </div>
                        );
                      }

                      return (
                        <div key={char.id} className="relative">
                          {isSelected && (
                            <div className="absolute top-2 right-10 z-10">
                              <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                        <CharacterListItem
                            character={{ id: char.id, name: char.name, description: char.description, portrait_url: (char as any).portrait_url }}
                            actions={
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingId(char.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      );
                    })
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
