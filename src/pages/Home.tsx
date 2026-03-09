import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Scroll,
  Users,
  WifiOff,
  Smartphone,
  Skull,
  Search,
  Shield,
  Sparkles,
  Swords,
  ChevronDown,
} from "lucide-react";

const Home = () => {
  const { data: scenarios } = useQuery({
    queryKey: ["landing-scenarios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scenarios")
        .select("title, description, level")
        .order("level", { ascending: true });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/20 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Skull className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold text-primary">
              Flagellum Dei TTRPG
            </span>
          </div>
          <Link to="/auth">
            <Button size="sm" className="font-display tracking-wide">
              Play
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(43_74%_49%/0.08)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl space-y-6">
          <p className="font-display text-sm tracking-[0.3em] uppercase text-primary/70">
            A Tabletop RPG for 3–9 Players · Best Played In Person
          </p>
          <h1 className="font-display text-5xl font-black leading-[1.1] tracking-tight text-foreground md:text-7xl lg:text-8xl">
            Europe, 1340.
            <br />
            <span className="text-primary">The dead do not rest.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
            The Black Death sweeps the continent. The Inquisition tightens its
            grip. In the shadows, ancient cults perform unspeakable rites. Will
            you uncover the truth — or become its next victim?
          </p>
          <Link to="/auth">
            <Button
              size="lg"
              className="mt-6 font-display text-lg tracking-wide px-12 py-7"
            >
              Begin Your Quest
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-10 animate-bounce text-primary/40">
          <ChevronDown className="h-6 w-6" />
        </div>
      </section>

      {/* The World */}
      <section className="border-t border-primary/10 py-24 px-6">
        <div className="container mx-auto max-w-3xl text-center space-y-8">
          <Skull className="mx-auto h-10 w-10 text-primary/60" />
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            The World Awaits
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            The year is 1340. Europe festers under plague, famine, and war. The
            Hundred Years' War ravages France. The Papal court in Avignon hides
            terrible secrets. From Austrian abbeys to Arabian deserts, darkness
            stirs in every corner of the known world.
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground">
            <span className="font-display text-primary">Danse Macabre</span> is
            a nine-chapter campaign that takes your party across continents,
            through catacombs, cathedrals, and cursed battlefields — each
            scenario more harrowing than the last.
          </p>
        </div>
      </section>

      {/* What You'll Do */}
      <section className="border-t border-primary/10 bg-card py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <h2 className="mb-16 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
            What You'll Do
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <RoleCard
              icon={<Search className="h-10 w-10 text-primary" />}
              title="Investigate"
              description="Solve ritualistic murders in remote abbeys. Expose criminal syndicates trafficking corpses beneath city streets. Unravel conspiracies that reach the Papal throne."
            />
            <RoleCard
              icon={<Shield className="h-10 w-10 text-blood" />}
              title="Survive"
              description="Navigate plague-stricken cities, civil uprisings, and the horrors of medieval warfare. Confront pagan witches, necromancers, and alchemical cults fuelled by blood."
            />
            <RoleCard
              icon={<Sparkles className="h-10 w-10 text-mystic" />}
              title="Shape Your Fate"
              description="Build unique characters with 147+ feats spanning combat prowess, dark arts, alchemy, and faith. Every choice carves your path through a world that offers no mercy."
            />
          </div>
        </div>
      </section>

      {/* Campaign Showcase */}
      {scenarios && scenarios.length > 0 && (
        <section className="border-t border-primary/10 py-24 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-16 space-y-4">
              <Swords className="mx-auto h-10 w-10 text-primary/60" />
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                The Danse Macabre
              </h2>
              <p className="text-muted-foreground">
                Nine chapters. One relentless descent into darkness.
              </p>
            </div>
            <div className="space-y-4">
              {scenarios.map((scenario, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-5 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/25 hover:bg-accent"
                >
                  <Badge
                    variant="outline"
                    className="mt-0.5 shrink-0 border-primary/30 font-display text-primary text-xs tabular-nums"
                  >
                    Ch. {scenario.level}
                  </Badge>
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {scenario.title}
                    </h3>
                    {scenario.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {scenario.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How You Play */}
      <section className="border-t border-primary/10 bg-card py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="mb-12 text-center font-display text-2xl font-bold text-foreground/80">
            How You Play
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
            <MiniFeature
              icon={<Scroll className="h-6 w-6" />}
              label="GM hosts the scenario and reveals the story section by section"
            />
            <MiniFeature
              icon={<Users className="h-6 w-6" />}
              label="Players join with a code — everything syncs in real time"
            />
            <MiniFeature
              icon={<WifiOff className="h-6 w-6" />}
              label="All content is cached locally — works fully offline"
            />
            <MiniFeature
              icon={<Smartphone className="h-6 w-6" />}
              label="Install as an app on any phone or tablet"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-primary/10 py-24 px-6 text-center">
        <div className="mx-auto max-w-xl space-y-6">
          <Skull className="mx-auto h-12 w-12 text-primary/40" />
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            The plague waits for no one.
          </h2>
          <p className="text-muted-foreground">
            Gather your party and enter the world of Flagellum Dei TTRPG.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link to="/auth">
              <Button
                size="lg"
                className="font-display tracking-wide px-10 py-6 text-lg"
              >
                Begin Your Quest
              </Button>
            </Link>
            <Link to="/install">
              <Button
                variant="outline"
                size="lg"
                className="font-display tracking-wide border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
              >
                Install the App
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-10 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Skull className="h-4 w-4 text-primary/40" />
          <span className="font-display text-sm">Flagellum Dei TTRPG</span>
        </div>
      </footer>
    </div>
  );
};

const RoleCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-lg border border-border bg-background p-8 text-center space-y-4">
    {icon}
    <h3 className="font-display text-xl font-semibold text-foreground">
      {title}
    </h3>
    <p className="text-sm leading-relaxed text-muted-foreground">
      {description}
    </p>
  </div>
);

const MiniFeature = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <div className="flex flex-col items-center gap-3 text-muted-foreground">
    {icon}
    <p className="text-sm leading-relaxed">{label}</p>
  </div>
);

export default Home;
