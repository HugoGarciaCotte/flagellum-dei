import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Crown, LogOut, Plus, DoorOpen, Scroll, Users, Settings, ChevronDown, Sword, Trash2, Pencil, ShieldCheck } from "lucide-react";
import { useOfflineScenarios } from "@/hooks/useOfflineScenarios";
import { getCachedScenarios, isOffline } from "@/lib/offlineStorage";
import { useIsOwner } from "@/hooks/useIsOwner";
import { useIsGameMaster } from "@/hooks/useIsGameMaster";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState("");
  const [hostOpen, setHostOpen] = useState(false);
  const [charDialogOpen, setCharDialogOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<string | null>(null);
  const [charName, setCharName] = useState("");
  const [charDesc, setCharDesc] = useState("");
  const { isOwner } = useIsOwner();
  const { isGameMaster } = useIsGameMaster();
  const [gmDialogOpen, setGmDialogOpen] = useState(false);

  useOfflineScenarios();

  // Characters
  const { data: characters } = useQuery({
    queryKey: ["my-characters", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveCharMutation = useMutation({
    mutationFn: async () => {
      if (editingChar) {
        const { error } = await supabase
          .from("characters")
          .update({ name: charName, description: charDesc || null })
          .eq("id", editingChar);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("characters")
          .insert({ user_id: user!.id, name: charName, description: charDesc || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      setCharDialogOpen(false);
      resetCharForm();
      toast({ title: editingChar ? "Character updated" : "Character created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCharMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("characters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-characters"] });
      toast({ title: "Character deleted" });
    },
  });

  const resetCharForm = () => {
    setCharName("");
    setCharDesc("");
    setEditingChar(null);
  };

  const openEditChar = (c: any) => {
    setEditingChar(c.id);
    setCharName(c.name);
    setCharDesc(c.description || "");
    setCharDialogOpen(true);
  };

  // Scenarios
  const { data: scenarios } = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      if (isOffline()) {
        const cached = getCachedScenarios();
        if (cached) return cached;
      }
      const { data, error } = await supabase.from("scenarios").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Active games (hosted)
  const { data: myGames } = useQuery({
    queryKey: ["my-games", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*, scenarios(title)")
        .eq("host_user_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Active games (joined as player)
  const { data: joinedGames } = useQuery({
    queryKey: ["joined-games", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_players")
        .select("game_id, games!inner(id, join_code, status, host_user_id, scenarios(title))")
        .eq("user_id", user!.id)
        .eq("games.status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Merge hosted + joined games, deduplicated
  const allActiveGames = useMemo(() => {
    const games: { id: string; title: string; join_code: string; role: "hosting" | "playing" }[] = [];
    const seen = new Set<string>();
    if (myGames) {
      for (const g of myGames) {
        seen.add(g.id);
        games.push({ id: g.id, title: (g as any).scenarios?.title || "Untitled", join_code: g.join_code, role: "hosting" });
      }
    }
    if (joinedGames) {
      for (const jp of joinedGames) {
        const g = (jp as any).games;
        if (g && !seen.has(g.id)) {
          seen.add(g.id);
          games.push({ id: g.id, title: g.scenarios?.title || "Untitled", join_code: g.join_code, role: "playing" });
        }
      }
    }
    return games;
  }, [myGames, joinedGames]);

  const handleCreateGame = async (scenarioId: string) => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const code = Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 26)]).join("");
    const { data, error } = await supabase
      .from("games")
      .insert({ host_user_id: user!.id, scenario_id: scenarioId, join_code: code })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    navigate(`/game/${data.id}/host`);
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) return;
    const { data: game, error } = await supabase
      .from("games")
      .select("*")
      .eq("join_code", joinCode.toUpperCase())
      .eq("status", "active")
      .single();
    if (error || !game) {
      toast({ title: "Game not found", description: "Check the code and try again.", variant: "destructive" });
      return;
    }
    const { error: joinError } = await supabase
      .from("game_players")
      .insert({ game_id: game.id, user_id: user!.id });
    if (joinError && !joinError.message.includes("duplicate")) {
      toast({ title: "Error joining", description: joinError.message, variant: "destructive" });
      return;
    }
    navigate(`/game/${game.id}/play`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <h1 className="font-display text-xl font-bold text-primary flex items-center gap-2">
            <Crown className="h-5 w-5" /> Prima TTRPG Helper
          </h1>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-2">
                <Settings className="h-4 w-4" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-10 max-w-2xl">
        {/* Section 1: Join a Game */}
        <section className="space-y-3">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <DoorOpen className="h-6 w-6 text-primary" /> Join a Game
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="Enter join code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
              className="font-display text-lg tracking-widest uppercase text-center"
            />
            <Button onClick={handleJoinGame} className="font-display px-6 shrink-0">
              Join
            </Button>
          </div>
        </section>

        {/* Section 2: My Characters */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
              <Sword className="h-6 w-6 text-primary" /> My Characters
            </h2>
            <Dialog open={charDialogOpen} onOpenChange={(open) => { setCharDialogOpen(open); if (!open) resetCharForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 font-display">
                  <Plus className="h-4 w-4" /> New Character
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">{editingChar ? "Edit Character" : "Create Character"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Character name"
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={charDesc}
                    onChange={(e) => setCharDesc(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={() => saveCharMutation.mutate()}
                    disabled={!charName.trim() || saveCharMutation.isPending}
                    className="w-full font-display"
                  >
                    {editingChar ? "Save Changes" : "Create Character"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {characters && characters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {characters.map((c) => (
                <Card key={c.id} className="border-border hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="font-display text-lg">{c.name}</CardTitle>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditChar(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCharMutation.mutate(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {c.description && <CardDescription>{c.description}</CardDescription>}
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Sword className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="font-display">No characters yet</p>
                <p className="text-sm mt-1">Create a character to get started.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Active Games */}
        {allActiveGames.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Your Active Games
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allActiveGames.map((game) => (
                <Card
                  key={game.id}
                  className="cursor-pointer border-primary/20 hover:border-primary/50 transition-colors"
                  onClick={() => navigate(game.role === "hosting" ? `/game/${game.id}/host` : `/game/${game.id}/play`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-lg">{game.title}</CardTitle>
                      <span className={`text-xs font-display px-2 py-0.5 rounded-full ${game.role === "hosting" ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground"}`}>
                        {game.role === "hosting" ? "Hosting" : "Playing"}
                      </span>
                    </div>
                    <CardDescription>Code: <span className="font-mono text-primary tracking-widest">{game.join_code}</span></CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Host a Game (collapsible) */}
        {isGameMaster ? (
          /* Game Master: show Host a Game */
          <Collapsible open={hostOpen} onOpenChange={setHostOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground font-display w-full justify-between">
                <span className="flex items-center gap-2">
                  <Scroll className="h-4 w-4" /> Host a Game
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${hostOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {scenarios && scenarios.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {scenarios.map((scenario) => (
                    <Card key={scenario.id} className="border-border hover:border-primary/40 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-display text-base">{scenario.title}</CardTitle>
                        {scenario.description && <CardDescription className="text-xs">{scenario.description}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                        <Button onClick={() => handleCreateGame(scenario.id)} variant="outline" className="w-full gap-2 font-display" size="sm">
                          <Plus className="h-3.5 w-3.5" /> Host
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No scenarios available yet.</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          /* Player: show Become a Game Master */
          <AlertDialog open={gmDialogOpen} onOpenChange={setGmDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 font-display w-full justify-center border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-primary/40">
                <ShieldCheck className="h-4 w-4" /> Become a Game Master
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Become a Game Master
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed">
                  You are currently a <strong>player</strong>. As a Game Master, you'll be able to host games and guide other players through scenarios.
                  <br /><br />
                  Would you like to become a Game Master?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-display">Stay as Player</AlertDialogCancel>
                <AlertDialogAction
                  className="font-display gap-2"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("user_roles")
                      .insert({ user_id: user!.id, role: "game_master" as any });
                    if (error) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                      return;
                    }
                    queryClient.invalidateQueries({ queryKey: ["user-role-game-master"] });
                    toast({ title: "You are now a Game Master!", description: "You can now host games." });
                  }}
                >
                  <ShieldCheck className="h-4 w-4" /> Become Game Master
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </main>
    </div>
  );
};

export default Dashboard;
