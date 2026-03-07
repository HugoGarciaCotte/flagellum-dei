import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Users, ChevronDown, Pencil } from "lucide-react";
import CharacterSheet from "@/components/CharacterSheet";

interface PlayerRow {
  user_id: string;
  display_name: string | null;
  character_id: string | null;
  character_name: string | null;
  character_description: string | null;
}

const GMPlayerList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<PlayerRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const { data: players } = useQuery({
    queryKey: ["gm-players", user?.id],
    queryFn: async () => {
      // Get all game_players from games hosted by this user
      const { data, error } = await supabase
        .from("game_players")
        .select(`
          user_id,
          character_id,
          games!inner(host_user_id),
          characters(id, name, description),
          profiles:user_id(display_name)
        `)
        .eq("games.host_user_id", user!.id);
      if (error) throw error;

      // Deduplicate by user_id, prefer entries with a character
      const map = new Map<string, PlayerRow>();
      for (const row of data ?? []) {
        const uid = row.user_id;
        if (uid === user!.id) continue; // skip self
        const existing = map.get(uid);
        const char = row.characters as any;
        const profile = row.profiles as any;
        const entry: PlayerRow = {
          user_id: uid,
          display_name: profile?.display_name ?? null,
          character_id: char?.id ?? null,
          character_name: char?.name ?? null,
          character_description: char?.description ?? null,
        };
        if (!existing || (entry.character_id && !existing.character_id)) {
          map.set(uid, entry);
        }
      }
      return Array.from(map.values());
    },
    enabled: !!user,
  });

  const updateCharMutation = useMutation({
    mutationFn: async ({ id, name, desc }: { id: string; name: string; desc: string }) => {
      const { error } = await supabase
        .from("characters")
        .update({ name, description: desc || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gm-players"] });
      toast({ title: "Character updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (p: PlayerRow) => {
    setEditPlayer(p);
    setEditName(p.character_name || "");
    setEditDesc(p.character_description || "");
  };

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
              <Card key={p.user_id} className="border-border hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-base">{p.display_name || "Unknown"}</CardTitle>
                      {p.character_name && (
                        <CardDescription className="text-xs mt-1">
                          Playing: <span className="text-foreground font-medium">{p.character_name}</span>
                        </CardDescription>
                      )}
                      {!p.character_name && (
                        <CardDescription className="text-xs mt-1 italic">No character selected</CardDescription>
                      )}
                    </div>
                    {p.character_id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Player Character Dialog */}
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
