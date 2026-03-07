import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Crown, LogOut, Plus, DoorOpen, Scroll, Users } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);

  const { data: scenarios } = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scenarios").select("*, scenario_sections(count)");
      if (error) throw error;
      return data;
    },
  });

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

  const handleCreateGame = async (scenarioId: string) => {
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from("games")
      .insert({ host_user_id: user!.id, scenario_id: scenarioId, join_code: joinCode })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    navigate(`/game/${data.id}/host`);
  };

  const handleJoinGame = async () => {
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
    // Add player
    const { error: joinError } = await supabase
      .from("game_players")
      .insert({ game_id: game.id, user_id: user!.id });
    if (joinError && !joinError.message.includes("duplicate")) {
      toast({ title: "Error joining", description: joinError.message, variant: "destructive" });
      return;
    }
    setJoinOpen(false);
    navigate(`/game/${game.id}/play`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <h1 className="font-display text-xl font-bold text-primary flex items-center gap-2">
            <Crown className="h-5 w-5" /> Quest Scroll
          </h1>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-10">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 hover:border-primary">
                <DoorOpen className="h-4 w-4" /> Join a Game
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Join a Game</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Enter join code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="text-center font-display text-lg tracking-widest uppercase"
                />
                <Button onClick={handleJoinGame} className="w-full font-display">Enter the Game</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Games */}
        {myGames && myGames.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Your Active Games
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGames.map((game) => (
                <Card
                  key={game.id}
                  className="cursor-pointer border-primary/20 hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/game/${game.id}/host`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg">{(game as any).scenarios?.title}</CardTitle>
                    <CardDescription>Code: <span className="font-mono text-primary tracking-widest">{game.join_code}</span></CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Scenarios */}
        <section className="space-y-4">
          <h2 className="font-display text-xl text-foreground flex items-center gap-2">
            <Scroll className="h-5 w-5 text-primary" /> Available Scenarios
          </h2>
          {scenarios && scenarios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map((scenario) => (
                <Card key={scenario.id} className="border-border hover:border-primary/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="font-display text-lg">{scenario.title}</CardTitle>
                    {scenario.description && (
                      <CardDescription>{scenario.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => handleCreateGame(scenario.id)} className="w-full gap-2 font-display" size="sm">
                      <Plus className="h-4 w-4" /> Host Game
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Scroll className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-display">No scenarios available yet</p>
                <p className="text-sm mt-1">Scenarios will appear here once added.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
