import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalRows } from "@/hooks/useLocalData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown, Pencil } from "lucide-react";
import CharacterSheet from "@/components/CharacterSheet";
import CharacterListItem from "@/components/CharacterListItem";

interface PlayerRow {
  user_id: string;
  display_name: string | null;
  character_id: string | null;
  character_name: string | null;
  character_description: string | null;
}

const GMPlayerList = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<PlayerRow | null>(null);

  const games = useLocalRows("games", { host_user_id: user?.id });
  const allGamePlayers = useLocalRows("game_players");
  const allCharacters = useLocalRows("characters");
  const allProfiles = useLocalRows("profiles");

  const players = useMemo(() => {
    if (!user) return [];
    const myGameIds = new Set(games.map((g: any) => g.id));
    const profileMap = new Map(allProfiles.map((p: any) => [p.user_id, p]));
    const charMap = new Map(allCharacters.map((c: any) => [c.id, c]));

    const map = new Map<string, PlayerRow>();
    for (const gp of allGamePlayers) {
      if (!myGameIds.has((gp as any).game_id)) continue;
      if ((gp as any).user_id === user.id) continue;
      const uid = (gp as any).user_id;
      const existing = map.get(uid);
      const char = (gp as any).character_id ? charMap.get((gp as any).character_id) : null;
      const profile = profileMap.get(uid);
      const entry: PlayerRow = {
        user_id: uid,
        display_name: (profile as any)?.display_name ?? null,
        character_id: char?.id ?? null,
        character_name: char?.name ?? null,
        character_description: char?.description ?? null,
      };
      if (!existing || (entry.character_id && !existing.character_id)) {
        map.set(uid, entry);
      }
    }
    return Array.from(map.values());
  }, [user, games, allGamePlayers, allCharacters, allProfiles]);

  if (!players || players.length === 0) return null;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground font-display w-full justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> My Players
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map((p) => (
              <div key={p.user_id} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-1">{p.display_name || "Unknown"}</p>
                {p.character_id ? (
                  <CharacterListItem
                    character={{ id: p.character_id, name: p.character_name || "Unnamed", description: p.character_description }}
                    actions={
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditPlayer(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                ) : (
                  <p className="text-xs text-muted-foreground italic px-1">No character selected</p>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={!!editPlayer} onOpenChange={(o) => { if (!o) setEditPlayer(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit {editPlayer?.display_name}'s Character
            </DialogTitle>
          </DialogHeader>
          {editPlayer?.character_id && (
            <CharacterSheet
              characterId={editPlayer.character_id}
              mode="gm"
              onDone={() => setEditPlayer(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GMPlayerList;
