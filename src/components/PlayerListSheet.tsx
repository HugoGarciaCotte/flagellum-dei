import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import CharacterDetailsDialog from "@/components/CharacterDetailsDialog";
import CharacterListItem from "@/components/CharacterListItem";
import { useTranslation } from "@/i18n/useTranslation";

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
  deleted_at?: string | null;
}

interface PlayerListSheetProps {
  players: Player[];
  characters: Character[];
  gameId: string;
}

const PlayerListSheet = ({ players, characters }: PlayerListSheetProps) => {
  const [viewingCharId, setViewingCharId] = useState<string | null>(null);
  const { t } = useTranslation();

  const charsByUser = new Map<string, Character[]>();
  for (const c of characters) {
    if (c.deleted_at) continue;
    const list = charsByUser.get(c.user_id) ?? [];
    list.push(c);
    charsByUser.set(c.user_id, list);
  }

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <button className="flex items-center gap-1 text-muted-foreground text-base hover:text-foreground transition-colors cursor-pointer">
            <span className="text-base" aria-hidden="true">🜊</span> {players.length}
          </button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display flex items-center gap-2">
              <span className="text-lg text-primary" aria-hidden="true">🜊</span> {t("gm.playersCount").replace("{count}", String(players.length))}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {players.length === 0 ? (
              <p className="text-base text-muted-foreground text-center py-8">{t("gm.noPlayers")}</p>
            ) : (
              players.map((player) => {
                const displayName = (player as any).profiles?.display_name || t("gm.unknownPlayer");
                const playerChars = charsByUser.get(player.user_id) ?? [];
                const selectedCharId = player.character_id;

                const selectedChar = playerChars.find((c) => c.id === selectedCharId);
                const otherChars = playerChars.filter((c) => c.id !== selectedCharId);

                return (
                  <div key={player.id} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground px-1">{displayName}</p>

                    {playerChars.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic px-1">{t("gm.noCharacters")}</p>
                    ) : (
                      <>
                        {selectedChar && (
                          <CharacterListItem
                            character={{ id: selectedChar.id, name: selectedChar.name, description: selectedChar.description, portrait_url: (selectedChar as any).portrait_url }}
                            onView={() => setViewingCharId(selectedChar.id)}
                          />
                        )}

                        {!selectedChar && (
                          <p className="text-sm text-muted-foreground italic px-1">{t("gm.noCharacterSelected")}</p>
                        )}

                        {otherChars.length > 0 && (
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-1 cursor-pointer group">
                              <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                              {t("gm.otherCharacters").replace("{count}", String(otherChars.length))}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-1 space-y-1 pl-1">
                              {otherChars.map((char) => (
                                <button
                                  key={char.id}
                                  type="button"
                                  onClick={() => setViewingCharId(char.id)}
                                  className="w-full flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm hover:border-primary/40 hover:bg-accent/40 transition-colors text-left"
                                >
                                  <span className="text-muted-foreground">{char.name}</span>
                                  <span className="text-base text-muted-foreground/70 shrink-0" aria-hidden="true">🜍</span>
                                </button>
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

      <CharacterDetailsDialog
        characterId={viewingCharId}
        open={!!viewingCharId}
        onOpenChange={(o) => { if (!o) setViewingCharId(null); }}
        canEdit
        canDelete={false}
        editMode="gm"
      />
    </>
  );
};

export default PlayerListSheet;
