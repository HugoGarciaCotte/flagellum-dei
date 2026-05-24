import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalRows } from "@/hooks/useLocalData";
import { getBy } from "@/lib/localStore";
import { pullTable } from "@/lib/syncManager";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown, Pencil } from "lucide-react";
import CharacterSheet from "@/components/CharacterSheet";
import CharacterListItem from "@/components/CharacterListItem";
import { useTranslation } from "@/i18n/useTranslation";

interface Character {
  id: string;
  name: string;
  description: string | null;
  portrait_url?: string | null;
  user_id: string;
  updated_at?: string | null;
  created_at?: string | null;
}

interface PlayerEntry {
  user_id: string;
  display_name: string | null;
  currentChar: Character | null;
  otherChars: Character[];
}

const GMPlayerList = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ characterId: string; playerName: string } | null>(null);

  const games = useLocalRows("games", { host_user_id: user?.id });
  const allGamePlayers = useLocalRows("game_players");
  const allCharacters = useLocalRows<Character>("characters");
  const allProfiles = useLocalRows("profiles");

  const players = useMemo<PlayerEntry[]>(() => {
    if (!user) return [];
    const myGameIds = new Set(games.map((g: any) => g.id));
    const profileMap = new Map(allProfiles.map((p: any) => [p.user_id, p]));
    const charsByUser = new Map<string, Character[]>();
    for (const c of allCharacters as Character[]) {
      const list = charsByUser.get(c.user_id) ?? [];
      list.push(c);
      charsByUser.set(c.user_id, list);
    }

    const seen = new Set<string>();
    const out: PlayerEntry[] = [];
    for (const gp of allGamePlayers) {
      if (!myGameIds.has((gp as any).game_id)) continue;
      const uid = (gp as any).user_id;
      if (uid === user.id || seen.has(uid)) continue;
      seen.add(uid);
      const profile = profileMap.get(uid);
      const chars = [...(charsByUser.get(uid) ?? [])].sort((a, b) => {
        const au = a.updated_at || a.created_at || "";
        const bu = b.updated_at || b.created_at || "";
        if (au !== bu) return bu.localeCompare(au);
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
      out.push({
        user_id: uid,
        display_name: (profile as any)?.display_name ?? null,
        currentChar: chars[0] ?? null,
        otherChars: chars.slice(1),
      });
    }
    return out;
  }, [user, games, allGamePlayers, allCharacters, allProfiles]);

  const openEdit = async (characterId: string, playerName: string) => {
    setEditing({ characterId, playerName });
    // Feats now live on characters.feats — one pull is enough.
    await pullTable("characters", { id: characterId });
  };


  if (!players || players.length === 0) return null;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground font-display w-full justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> {t("gm.myPlayers")}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map((p) => {
              const displayName = p.display_name || t("gm.unknown");
              const selectedChar = p.characters.find((c) => c.id === p.selectedCharId) ?? null;
              const otherChars = p.characters.filter((c) => c.id !== p.selectedCharId);
              return (
                <div key={p.user_id} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground px-1">{displayName}</p>

                  {selectedChar ? (
                    <CharacterListItem
                      character={{ id: selectedChar.id, name: selectedChar.name, description: selectedChar.description, portrait_url: selectedChar.portrait_url }}
                      actions={
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit(selectedChar.id, displayName)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                  ) : (
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
                          <div key={char.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                            <span className="text-muted-foreground truncate">{char.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => openEdit(char.id, displayName)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {t("gm.editCharacter").replace("{name}", editing?.playerName || t("gm.unknown"))}
            </DialogTitle>
          </DialogHeader>
          {editing?.characterId && (
            <CharacterSheet
              characterId={editing.characterId}
              mode="gm"
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GMPlayerList;
