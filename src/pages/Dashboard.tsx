import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAllScenarios, getScenarioById } from "@/data/scenarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Plus, Settings, ChevronDown, Trash2, Pencil, WifiOff } from "lucide-react";

import CharacterSheet from "@/components/CharacterSheet";
import PageHeader from "@/components/PageHeader";
import CharacterCreationWizard from "@/components/CharacterCreationWizard";
import CharacterListItem from "@/components/CharacterListItem";

import { useIsOwner } from "@/hooks/useIsOwner";
import { useIsGameMaster } from "@/hooks/useIsGameMaster";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import GMPlayerList from "@/components/GMPlayerList";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useLocalRows } from "@/hooks/useLocalData";
import { upsertRow, deleteRow, deleteBy } from "@/lib/localStore";
import { triggerPush } from "@/lib/syncManager";
import { useTranslation } from "@/i18n/useTranslation";

const Dashboard = () => {
  const { user, signOut, isGuest } = useAuth();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const { t } = useTranslation();
  const [joinCode, setJoinCode] = useState("");
  const [hostOpen, setHostOpen] = useState(false);
  const [newCharDialogOpen, setNewCharDialogOpen] = useState(false);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const { isOwner } = useIsOwner();
  const { isGameMaster, setGuestGameMaster } = useIsGameMaster();
  const [gmDialogOpen, setGmDialogOpen] = useState(false);
  const [deleteCharTarget, setDeleteCharTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const characters = useLocalRows<any>("characters", user ? { user_id: user.id } : undefined);
  const sortedCharacters = useMemo(() =>
    [...characters].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [characters]
  );

  const handleDeleteChar = (id: string) => {
    setDeleting(true);
    deleteRow("characters", id);
    deleteBy("character_feats", { character_id: id });
    deleteBy("character_feat_subfeats", {});
    triggerPush();
    setDeleteCharTarget(null);
    setDeleting(false);
    toast({ title: t("dashboard.characterDeleted") });
  };

  const scenarios = getAllScenarios();

  const allGames = useLocalRows<any>("games");
  const gamePlayers = useLocalRows<any>("game_players", user ? { user_id: user.id } : undefined);

  const allActiveGames = useMemo(() => {
    const games: { id: string; title: string; join_code: string; role: "hosting" | "playing" }[] = [];
    const seen = new Set<string>();
    for (const g of allGames) {
      if (g.host_user_id === user?.id && g.status === "active") {
        seen.add(g.id);
        const sc = getScenarioById(g.scenario_id);
        games.push({ id: g.id, title: sc?.title || "Untitled", join_code: g.join_code, role: "hosting" });
      }
    }
    for (const gp of gamePlayers) {
      if (!seen.has(gp.game_id)) {
        const g = allGames.find((g: any) => g.id === gp.game_id && g.status === "active");
        if (g) {
          seen.add(g.id);
          const sc = getScenarioById(g.scenario_id);
          games.push({ id: g.id, title: sc?.title || "Untitled", join_code: g.join_code, role: "playing" });
        }
      }
    }
    return games;
  }, [allGames, gamePlayers, user]);

  const handleCreateGame = async (scenarioId: string) => {
    const tempGameId = crypto.randomUUID();
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const code = Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 26)]).join("");
    const now = new Date().toISOString();
    const newGame = {
      id: tempGameId, host_user_id: user!.id, scenario_id: scenarioId, join_code: code,
      status: "active", current_section: null, created_at: now, updated_at: now,
    };
    upsertRow("games", newGame);
    triggerPush();
    try {
      const { data, error } = await supabase.from("games").insert({ host_user_id: user!.id, scenario_id: scenarioId, join_code: code }).select().single();
      if (!error && data) { deleteRow("games", tempGameId); upsertRow("games", data); navigate(`/game/${data.id}/host`); return; }
    } catch {}
    navigate(`/game/${tempGameId}/host`);
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) return;
    try {
      const { data: game, error } = await supabase.from("games").select("*").eq("join_code", joinCode.toUpperCase()).eq("status", "active").single();
      if (error || !game) { toast({ title: t("dashboard.gameNotFound"), description: t("dashboard.checkCode"), variant: "destructive" }); return; }
      const { error: joinError } = await supabase.from("game_players").insert({ game_id: game.id, user_id: user!.id });
      if (joinError && !joinError.message.includes("duplicate")) { toast({ title: t("dashboard.errorJoining"), description: joinError.message, variant: "destructive" }); return; }
      upsertRow("games", game);
      upsertRow("game_players", { id: crypto.randomUUID(), game_id: game.id, user_id: user!.id, character_id: null, joined_at: new Date().toISOString() });
      navigate(`/game/${game.id}/play`);
    } catch {
      toast({ title: t("dashboard.serverUnreachable"), description: t("dashboard.needOnlineToJoin"), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Flagellum Dei"
        rightActions={
          <>
            {isOwner && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-2">
                <Settings className="h-4 w-4" /> {t("dashboard.admin")}
              </Button>
            )}
            {isGuest ? (
              <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/auth"); }} className="gap-2">
                {t("dashboard.signUp")}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" /> {t("dashboard.signOut")}
              </Button>
            )}
          </>
        }
      />

      <main className="container py-8 space-y-10 max-w-2xl" style={{ background: "radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.04) 0%, transparent 50%)" }}>
        {/* Join a Game */}
        <section className="space-y-3">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <span className="text-xl text-primary" aria-hidden="true">🜊</span> {t("dashboard.joinGame")}
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder={!online ? t("dashboard.offlineJoinUnavailable") : t("dashboard.enterCode")}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
              className="font-display text-lg tracking-widest uppercase text-center"
              disabled={!online}
            />
            <Button onClick={handleJoinGame} className="font-display px-6 shrink-0" disabled={!online}>
              {t("dashboard.join")}
            </Button>
          </div>
          {!online && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> {t("dashboard.needOnline")}
            </p>
          )}
        </section>

        <div className="ornamental-divider" />

        {/* My Characters */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
              <span className="text-xl text-primary" aria-hidden="true">🝖</span> {t("dashboard.myCharacters")}
            </h2>
            <Dialog open={newCharDialogOpen} onOpenChange={setNewCharDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 font-display">
                  <Plus className="h-4 w-4" /> {t("dashboard.newCharacter")}
                </Button>
              </DialogTrigger>
              <DialogContent className="fixed inset-0 max-w-none w-full h-full rounded-none p-0 translate-x-0 translate-y-0 left-0 top-0 border-none overflow-hidden">
                <div className="flex flex-col h-full min-h-0">
                  <div className="border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0 safe-top">
                    <span className="font-display text-sm font-medium text-foreground">{t("dashboard.createCharacter")}</span>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="container max-w-2xl py-6 px-4">
                      <CharacterCreationWizard
                        onCreated={() => { setNewCharDialogOpen(false); toast({ title: t("dashboard.characterCreated") }); }}
                        onCancel={() => setNewCharDialogOpen(false)}
                      />
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {sortedCharacters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sortedCharacters.map((c) => (
                <CharacterListItem
                  key={c.id}
                  character={c}
                  actions={
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCharId(c.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCharTarget({ id: c.id, name: c.name })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="py-8 text-center text-muted-foreground">
                <span className="text-2xl mx-auto mb-2 opacity-40 block text-center" aria-hidden="true">🝖</span>
                <p className="font-display">{t("dashboard.noCharacters")}</p>
                <p className="text-sm mt-1">{t("dashboard.createToStart")}</p>
              </CardContent>
            </Card>
          )}

          <Dialog open={!!editingCharId} onOpenChange={(open) => { if (!open) setEditingCharId(null); }}>
            <DialogContent className="fixed inset-0 max-w-none w-full h-full rounded-none p-0 translate-x-0 translate-y-0 left-0 top-0 border-none overflow-hidden">
              <div className="flex flex-col h-full min-h-0">
                <div className="border-b border-border/50 bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0 safe-top">
                  <span className="font-display text-sm font-medium text-foreground">{t("dashboard.editCharacter")}</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="container max-w-2xl py-6 px-4">
                    {editingCharId && (
                      <CharacterSheet characterId={editingCharId} mode="player" onDone={() => setEditingCharId(null)} />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </section>

        <div className="ornamental-divider" />

        {/* Active Games */}
        {allActiveGames.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl text-foreground flex items-center gap-2">
              <span className="text-lg text-primary" aria-hidden="true">🜊</span> {t("dashboard.activeGames")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allActiveGames.map((game) => (
                <Card
                  key={game.id}
                  className="cursor-pointer aged-border gold-glow-box hover:border-primary/50 transition-colors"
                  onClick={() => navigate(game.role === "hosting" ? `/game/${game.id}/host` : `/game/${game.id}/play`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-lg">{game.title}</CardTitle>
                      <span className={`text-xs font-display px-2 py-0.5 rounded-full ${game.role === "hosting" ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground"}`}>
                        {game.role === "hosting" ? t("dashboard.hosting") : t("dashboard.playing")}
                      </span>
                    </div>
                    {game.join_code ? (
                      <CardDescription>Code: <span className="font-mono text-primary tracking-widest">{game.join_code}</span></CardDescription>
                    ) : (
                      <CardDescription className="text-muted-foreground/60">{t("dashboard.localGame")}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Host a Game */}
        {isGameMaster ? (
          <Collapsible open={hostOpen} onOpenChange={setHostOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground font-display w-full justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">🜾</span> {t("dashboard.hostGame")}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${hostOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {scenarios && scenarios.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {scenarios.map((scenario) => (
                    <Card key={scenario.id} className="aged-border hover:border-primary/40 transition-colors gold-glow-box">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-display text-base">{scenario.title}</CardTitle>
                        {scenario.description && <CardDescription className="text-xs">{scenario.description}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                        <Button onClick={() => handleCreateGame(scenario.id)} variant="outline" className="w-full gap-2 font-display" size="sm">
                          <Plus className="h-3.5 w-3.5" /> {t("dashboard.host")}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noScenarios")}</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <AlertDialog open={gmDialogOpen} onOpenChange={setGmDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 font-display w-full justify-center border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-primary/40">
                <span className="text-base" aria-hidden="true">🜁</span> {t("dashboard.becomeGM")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display flex items-center gap-2">
                  <span className="text-lg text-primary" aria-hidden="true">🜁</span> {t("dashboard.becomeGMTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed">
                  <span dangerouslySetInnerHTML={{ __html: t("dashboard.becomeGMDesc") }} />
                  <br /><br />
                  {t("dashboard.becomeGMConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-display">{t("dashboard.stayPlayer")}</AlertDialogCancel>
                <AlertDialogAction
                  className="font-display gap-2"
                  onClick={async () => {
                    if (isGuest) {
                      setGuestGameMaster(true);
                      toast({ title: t("dashboard.gmToast"), description: t("dashboard.gmToastDesc") });
                      return;
                    }
                    const roleRow = { id: crypto.randomUUID(), user_id: user!.id, role: "game_master" };
                    upsertRow("user_roles", roleRow);
                    triggerPush();
                    toast({ title: t("dashboard.gmToast"), description: t("dashboard.gmToastDesc") });
                  }}
                >
                  <span className="text-base" aria-hidden="true">🜁</span> {t("dashboard.becomeGMButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {isGameMaster && <GMPlayerList />}

        {/* Delete Character Confirmation */}
        <AlertDialog open={!!deleteCharTarget} onOpenChange={(open) => { if (!open) setDeleteCharTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dashboard.deleteTitle")} "{deleteCharTarget?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                {t("dashboard.deleteDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("dashboard.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCharTarget && handleDeleteChar(deleteCharTarget.id)}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? t("dashboard.deleting") : t("dashboard.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!window.matchMedia('(display-mode: standalone)').matches && (
          <p className="text-center py-6">
            <Link to="/install" className="text-xs text-muted-foreground/50 hover:text-primary transition-colors font-display">
              {t("dashboard.installApp")}
            </Link>
          </p>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
