import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Scroll, Users, Wifi, WifiOff, Smartphone } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Crown className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold text-primary">Prima TTRPG Helper</span>
          </div>
          <Link to="/auth">
            <Button size="sm" className="font-display tracking-wide">
              Play
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          <Crown className="mx-auto h-20 w-20 text-primary opacity-80" />
          <h1 className="font-display text-5xl font-black leading-tight tracking-tight text-foreground md:text-7xl">
            Unfold the <span className="text-primary">Story</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
            Prima TTRPG Helper lets you host and play immersive RPG scenarios with friends — in real time, on any device, even offline.
          </p>
          <Link to="/auth">
            <Button size="lg" className="mt-4 font-display text-lg tracking-wide px-10 py-6">
              Begin Your Quest
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-12 animate-bounce text-muted-foreground">
          <Scroll className="h-6 w-6" />
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <h2 className="mb-16 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Scroll className="h-10 w-10 text-primary" />}
              title="Host Scenarios"
              description="Create and guide immersive RPG scenarios. Control the narrative, reveal sections, and shape the adventure."
            />
            <FeatureCard
              icon={<Users className="h-10 w-10 text-primary" />}
              title="Real-time Play"
              description="Players join with a code and experience the story together. Every reveal syncs instantly across all devices."
            />
            <FeatureCard
              icon={<WifiOff className="h-10 w-10 text-primary" />}
              title="Works Offline"
              description="All scenario text is cached locally. No signal? No problem — the quest continues without interruption."
            />
          </div>
        </div>
      </section>

      {/* Install CTA */}
      <section className="border-t border-border py-20 px-6 text-center">
        <div className="mx-auto max-w-xl space-y-6">
          <Smartphone className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="font-display text-2xl font-bold text-foreground">Install as an App</h2>
          <p className="text-muted-foreground">
            Prima TTRPG Helper works as a native-feeling app on your phone or tablet. Install it for the best experience.
          </p>
          <Link to="/install">
            <Button variant="outline" className="font-display tracking-wide mt-2">
              Learn How to Install
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Crown className="h-4 w-4 text-primary" />
          <span className="font-display text-sm">Prima TTRPG Helper</span>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <Card className="border-border bg-secondary/50 text-center">
    <CardContent className="flex flex-col items-center gap-4 p-8">
      {icon}
      <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default Home;
