import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalRows } from "@/hooks/useLocalData";
import { getBy } from "@/lib/localStore";
import { pullTable } from "@/lib/syncManager";
import { supabase } from "@/integrations/supabase/client";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown } from "lucide-react";
import CharacterDetailsDialog from "@/components/CharacterDetailsDialog";
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
  const online = useNetworkStatus();
  const [open, setOpen] = useState(false);
  const [viewingCharId, setViewingCharId] = useState<string | null>(null);

  const games = useLocalRows("games", { host_user_id: user?.id });
  const allGamePlayers = useLocalRows("game_players");
  const allCharacters = useLocalRows<Character>("characters");
  const allProfiles = useLocalRows("profiles");

  // Collect every user_id that plays in one of my hosted games
  const playerUserIds = useMemo(() => {
    if (!user) return [] as string[];
    const myGameIds = new Set(games.map((g: any) => g.id));
    const ids = new Set<string>();
    for (const gp of allGamePlayers) {
      const gid = (gp as any).game_id;
      const uid = (gp as any).user_id;
      if (myGameIds.has(gid) && uid && uid !== user.id) ids.add(uid);
    }
    return [...ids];
  }, [user, games, allGamePlayers]);

  const playerIdsKey = playerUserIds.join(",");

  // Pull characters + profiles for every player whenever the player set changes
  useEffect(() => {
    if (!online || playerUserIds.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const uid of playerUserIds) {
        if (cancelled) return;
        await Promise.all([
          pullTable("characters", { user_id: uid }),
          pullTable("profiles", { user_id: uid }),
        ]);
      }
    })();
    return () => { cancelled = true; };
  }, [playerIdsKey, online]);

  // Realtime: refresh a player's characters/profile when they edit on their side
  useEffect(() => {
    if (!online || playerUserIds.length === 0) return;
    const idSet = new Set(playerUserIds);
    const channel = supabase.channel(`gm-players-${user?.id ?? "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "characters" }, (payload: any) => {
        const uid = payload.new?.user_id ?? payload.old?.user_id;
        if (uid && idSet.has(uid)) pullTable("characters", { user_id: uid });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload: any) => {
        const uid = payload.new?.user_id ?? payload.old?.user_id;
        if (uid && idSet.has(uid)) pullTable("profiles", { user_id: uid });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players" }, (payload: any) => {
        const gid = payload.new?.game_id ?? payload.old?.game_id;
        const myGameIds = new Set(games.map((g: any) => g.id));
        if (gid && myGameIds.has(gid)) {
          pullTable("game_players", { game_id: gid });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [playerIdsKey, online, user?.id]);

  const players = useMemo<PlayerEntry[]>(() => {
    if (!user) return [];
    const myGameIds = new Set(games.map((g: any) => g.id));
    const profileMap = new Map(allProfiles.map((p: any) => [p.user_id, p]));
    const charsByUser = new Map<string, Character[]>();
    for (const c of allCharacters as Character[]) {
      if ((c as any).deleted_at) continue;
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
      if (chars.length === 0) continue;
      out.push({
        user_id: uid,
        display_name: (profile as any)?.display_name ?? null,
        currentChar: chars[0] ?? null,

        otherChars: chars.slice(1),
      });
    }
    return out;
  }, [user, games, allGamePlayers, allCharacters, allProfiles]);

  const openView = async (characterId: string) => {
    setViewingCharId(characterId);
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
              const selectedChar = p.currentChar;
              const otherChars = p.otherChars;
              return (
                <div key={p.user_id} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground px-1">{displayName}</p>

                  {selectedChar ? (
                    <CharacterListItem
                      character={{ id: selectedChar.id, name: selectedChar.name, description: selectedChar.description, portrait_url: selectedChar.portrait_url }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic px-1">{t("gm.noCharacterSelected")}</p>
                  )}

                  {otherChars.length > 0 && (
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-display text-foreground bg-card/60 border border-border/60 rounded-md px-3 py-2 hover:bg-card transition-colors cursor-pointer group w-full">
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                        <span className="flex-1 text-left">{t("gm.otherCharacters").replace("{count}", String(otherChars.length))}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 space-y-1 pl-1">
                        {otherChars.map((char) => (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => openView(char.id)}
                            className="w-full flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm hover:border-primary/40 hover:bg-accent/40 transition-colors text-left"
                          >
                            <span className="text-muted-foreground truncate">{char.name}</span>
                            <span className="text-base text-muted-foreground/70 shrink-0" aria-hidden="true">🜍</span>
                          </button>
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

export default GMPlayerList;
