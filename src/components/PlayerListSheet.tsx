import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pencil, ChevronDown } from "lucide-react";
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
          <span className="text-base" aria-hidden="true">🜊</span> {players.length}
        </button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <span className="text-lg text-primary" aria-hidden="true">🜊</span> Players ({players.length})
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

              const selectedChar = playerChars.find((c) => c.id === selectedCharId);
              const otherChars = playerChars.filter((c) => c.id !== selectedCharId);

              return (
                <div key={player.id} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">{displayName}</p>

                  {playerChars.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-1">No characters</p>
                  ) : (
                    <>
                      {/* Selected character — full card */}
                      {selectedChar && (
                        editingId === selectedChar.id ? (
                          <div className="bg-muted/30 rounded-md p-2">
                            <CharacterSheet characterId={selectedChar.id} mode="gm" onDone={cancelEdit} />
                          </div>
                        ) : (
                          <CharacterListItem
                            character={{ id: selectedChar.id, name: selectedChar.name, description: selectedChar.description, portrait_url: (selectedChar as any).portrait_url }}
                            actions={
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingId(selectedChar.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        )
                      )}

                      {!selectedChar && (
                        <p className="text-xs text-muted-foreground italic px-1">No character selected</p>
                      )}

                      {/* Unselected characters — collapsed */}
                      {otherChars.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 cursor-pointer group">
                            <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                            {otherChars.length} other character{otherChars.length > 1 ? "s" : ""}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-1 space-y-1 pl-1">
                            {otherChars.map((char) => (
                              editingId === char.id ? (
                                <div key={char.id} className="bg-muted/30 rounded-md p-2">
                                  <CharacterSheet characterId={char.id} mode="gm" onDone={cancelEdit} />
                                </div>
                              ) : (
                                <div key={char.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                                  <span className="text-muted-foreground">{char.name}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditingId(char.id)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              )
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </>
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
