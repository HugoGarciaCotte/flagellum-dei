import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Users,
  Wifi,
  Globe,
  Cross,
  Flame,
  ScrollText,
} from "lucide-react";
import Logo from "@/components/Logo";

/* ──────────────────────────────────────────────
   SUB-COMPONENTS
   ────────────────────────────────────────────── */

const ClarityItem = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <div className="flex items-center gap-3 text-muted-foreground">
    <span className="text-primary">{icon}</span>
    <span className="font-display text-xs tracking-[0.15em] uppercase">
      {label}
    </span>
  </div>
);

const FeatureColumn = ({
  title,
  description,
}: {
  title: string;
  description: React.ReactNode;
}) => (
  <div className="space-y-4 text-center md:text-left">
    <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
    <div className="text-sm leading-relaxed text-muted-foreground">
      {description}
    </div>
  </div>
);

const StepCard = ({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: React.ReactNode;
}) => (
  <div className="relative space-y-4 rounded-lg border border-border bg-card p-8 text-center">
    <span className="font-display text-4xl font-black text-primary/20">
      {number}
    </span>
    <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
    <div className="text-sm leading-relaxed text-muted-foreground">
      {description}
    </div>
  </div>
);

const ScenarioCard = ({
  title,
  description,
  level,
}: {
  title: string;
  description: string;
  level?: number | null;
}) => (
  <div className="group relative overflow-hidden rounded border border-border bg-card transition-all duration-300 hover:border-primary/30 gold-glow-box">
    {/* Atmospheric top gradient */}
    <div className="h-32 bg-gradient-to-b from-crimson/10 via-background/80 to-card" />
    <div className="space-y-3 p-6 pt-0">
      {level != null && (
        <span className="font-display text-[10px] tracking-[0.3em] uppercase text-primary/50">
          Chapter {level}
        </span>
      )}
      <h3 className="font-display text-base font-bold text-foreground">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground italic">
        {description}
      </p>
    </div>
  </div>
);

/* ──────────────────────────────────────────────
   FAQ DATA
   ────────────────────────────────────────────── */

const faqs = [
  {
    q: "What is Flagellum Dei?",
    a: "Flagellum Dei is a historical horror tabletop role-playing game set during the Black Death. Players take on the roles of inquisitors investigating heresy, dark rituals, and supernatural terrors across 14th-century Europe.",
  },
  {
    q: "Is this a video game?",
    a: "No. Flagellum Dei is a pen-and-paper TTRPG designed for in-person play around a table or via video call. This website serves as your digital companion — providing character creation, scenarios, rules, and game tools.",
  },
  {
    q: "How many players can play?",
    a: "The game is designed for 3 to 9 players, with one player taking the role of Game Master who guides the investigation and narrates the story.",
  },
  {
    q: "Do I need a rulebook?",
    a: "No books, no downloads. Everything you need — rules, character creation, scenarios, and game tools — is built directly into this website.",
  },
  {
    q: "Can we play online?",
    a: "Yes. While Flagellum Dei is designed for in-person play, you can connect through any video call platform. Each player opens the website on their device to access their character sheet and game tools.",
  },
];

/* ──────────────────────────────────────────────
   SHOWCASE SCENARIOS (fallback if DB is empty)
   ────────────────────────────────────────────── */

const showcaseScenarios = [
  {
    title: "The Village of Ashes",
    description:
      "A village burned its own priest. Now the dead speak in the chapel ruins.",
    level: 1,
  },
  {
    title: "The Silent Monastery",
    description:
      "The monks have taken a vow of silence. But something answers prayers at night.",
    level: 2,
  },
  {
    title: "The Pilgrim's Curse",
    description:
      "A relic carried across Europe spreads miracles — and fear.",
    level: 3,
  },
];

/* ──────────────────────────────────────────────
   HOME PAGE
   ────────────────────────────────────────────── */

const Home = () => {
  const { data: scenarios } = useQuery({
    queryKey: ["landing-scenarios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scenarios")
        .select("title, description, level")
        .order("level", { ascending: true })
        .limit(6);
      return data ?? [];
    },
  });

  const displayScenarios =
    scenarios && scenarios.length > 0 ? scenarios : showcaseScenarios;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo className="text-2xl" />
            <span className="font-display text-sm font-bold tracking-[0.1em] uppercase text-primary/80 hidden sm:inline">
              Flagellum Dei
            </span>
          </div>
          <Link to="/auth">
            <Button
              size="sm"
              className="font-display text-xs tracking-[0.2em] uppercase"
            >
              Play
            </Button>
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════ */}
      <section className="relative flex min-h-screen items-center pt-20">
        {/* Background atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(43_74%_49%/0.06)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,hsl(0_70%_18%/0.08)_0%,transparent_50%)]" />

        <div className="container relative mx-auto grid gap-12 px-6 lg:grid-cols-2 lg:gap-20">
          {/* Left — Text */}
          <div className="flex flex-col justify-center space-y-8 lg:py-20">
            <p className="font-display text-[10px] tracking-[0.4em] uppercase text-primary/60">
              A Historical Horror Tabletop Role-Playing Game
            </p>
            <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight text-foreground md:text-7xl lg:text-8xl">
              FLAGELLUM
              <br />
              <span className="text-primary">DEI</span>
            </h1>
            <div className="space-y-1">
              <p className="font-display text-xl text-foreground/90 md:text-2xl">
                Enter 1347.
              </p>
              <p className="font-display text-xl text-foreground/90 md:text-2xl">
                Judge the damned.
              </p>
              <p className="font-display text-xl text-crimson md:text-2xl">
                Fear what answers.
              </p>
            </div>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              A historical horror tabletop role-playing game where players become
              inquisitors hunting heresy during the Black Death. Gather 3–9
              players around a table, open the website, and begin an
              investigation.
            </p>
            <p className="max-w-lg text-sm text-muted-foreground/60">
              No books. No downloads. Only the hunt.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="font-display text-sm tracking-[0.2em] uppercase px-10 py-7 gold-glow gold-glow-box"
                >
                  Start Your First Hunt
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="font-display text-xs tracking-[0.2em] uppercase border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
                >
                  See How It Works
                </Button>
              </a>
            </div>

            <p className="text-xs text-muted-foreground/40 tracking-wide">
              Free access · For 3–9 players · Designed for play together in
              person
            </p>
          </div>

          {/* Right — Atmospheric visual */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative h-[500px] w-full max-w-md">
              {/* Layered atmospheric gradients */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-card via-background to-card border border-border" />
              <div className="absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_50%_30%,hsl(43_74%_49%/0.1)_0%,transparent_60%)]" />
              <div className="absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_50%_70%,hsl(0_70%_18%/0.15)_0%,transparent_50%)]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <Cross className="h-16 w-16 text-primary/15" />
                <p className="font-display text-xs tracking-[0.5em] uppercase text-muted-foreground/30">
                  Anno Domini MCCCXLVII
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 2 — CLARITY STRIP
          ═══════════════════════════════════════ */}
      <section className="border-y border-primary/10 bg-card py-8">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-8 px-6 md:gap-14">
          <ClarityItem
            icon={<BookOpen className="h-4 w-4" />}
            label="Tabletop RPG"
          />
          <ClarityItem
            icon={<Users className="h-4 w-4" />}
            label="3–9 Players"
          />
          <ClarityItem
            icon={<Wifi className="h-4 w-4" />}
            label="Table or Video Call"
          />
          <ClarityItem
            icon={<Globe className="h-4 w-4" />}
            label="Everything on the Website"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 3 — NOT FANTASY
          ═══════════════════════════════════════ */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Subtle parchment-like texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(43_74%_49%/0.04)_0%,transparent_50%)]" />

        <div className="container relative mx-auto max-w-5xl">
          <div className="mb-20 text-center space-y-3">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl leading-tight">
              Not fantasy.
              <br />
              <span className="text-primary">A descent into history.</span>
            </h2>
          </div>

          <div className="ornamental-divider mx-auto max-w-xs mb-20" />

          <div className="grid gap-16 md:grid-cols-3">
            <FeatureColumn
              title="Historically Grounded Horror"
              description={
                <p>
                  Built from real medieval fears, beliefs, rituals, and
                  institutions. Investigations feel disturbingly plausible.
                </p>
              }
            />
            <FeatureColumn
              title="Relentless Atmosphere"
              description={
                <p>
                  Each scenario is written to create dread, tension, and moral
                  doubt. Violence is rare. Suspicion is constant.
                </p>
              }
            />
            <FeatureColumn
              title="Everything in the Website"
              description={
                <p>
                  Character creation, rules, scenarios, music, and player
                  visuals live in one place. Open the site and begin the
                  investigation.
                </p>
              }
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 4 — HOW IT WORKS
          ═══════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="border-t border-primary/10 bg-card py-32 px-6"
      >
        <div className="container mx-auto max-w-4xl">
          <div className="mb-20 text-center space-y-4">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              From First Click to First Investigation
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              number="I"
              title="Choose a Scenario"
              description={
                <p>
                  Select a complete investigation set in plague-era Europe. Each
                  scenario is a self-contained descent into darkness.
                </p>
              }
            />
            <StepCard
              number="II"
              title="Create Your Inquisitors"
              description={
                <p>
                  Build characters directly on the website. Choose feats, shape
                  backstories. No books required.
                </p>
              }
            />
            <StepCard
              number="III"
              title="Gather the Table"
              description={
                <p>
                  Bring together 3–9 players around a table or connect through
                  video call. Open the case. Begin the hunt.
                </p>
              }
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 5 — SCENARIO SHOWCASE
          ═══════════════════════════════════════ */}
      <section className="border-t border-primary/10 py-32 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-20 text-center space-y-4">
            <ScrollText className="mx-auto h-8 w-8 text-primary/40" />
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Open a Case. Enter a Nightmare.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {displayScenarios.slice(0, 3).map((s, i) => (
              <ScenarioCard
                key={i}
                title={s.title}
                description={s.description ?? ""}
                level={s.level}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 6 — DEPTH OF WRITING
          ═══════════════════════════════════════ */}
      <section className="relative border-t border-primary/10 bg-card py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,hsl(43_74%_49%/0.04)_0%,transparent_60%)]" />

        <div className="container relative mx-auto max-w-3xl text-center space-y-10">
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl leading-tight">
            Written like a campaign book.
            <br />
            <span className="text-primary">Delivered free in a browser.</span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Flagellum Dei is built for deep immersion. Each investigation is
            carefully researched and written to evoke the fears, beliefs, and
            tensions of medieval Europe during the Black Death. These are not
            disposable adventures. They are slow descents into faith, suspicion,
            and dread.
          </p>

          <div className="ornamental-divider mx-auto max-w-xs" />

          <blockquote className="font-display text-lg italic text-primary/70">
            "Some scenarios take nearly a year to write."
          </blockquote>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 7 — FAQ
          ═══════════════════════════════════════ */}
      <section className="border-t border-primary/10 py-32 px-6">
        <div className="container mx-auto max-w-2xl">
          <h2 className="mb-16 text-center font-display text-2xl font-bold text-foreground/80">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-border/50 px-2"
              >
                <AccordionTrigger className="font-display text-sm tracking-wide text-foreground/90 hover:no-underline hover:text-primary">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 8 — FINAL CTA
          ═══════════════════════════════════════ */}
      <section className="relative border-t border-primary/10 py-40 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(0_70%_18%/0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(43_74%_49%/0.06)_0%,transparent_40%)]" />

        <div className="relative mx-auto max-w-xl space-y-8">
          <Logo className="mx-auto text-5xl text-primary/30" />
          <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl leading-tight">
            Bring your players to the table.
            <br />
            <span className="text-crimson">The heresy is waiting.</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth">
              <Button
                size="lg"
                className="font-display text-sm tracking-[0.2em] uppercase px-10 py-7 gold-glow gold-glow-box"
              >
                Begin the Investigation
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                variant="outline"
                size="lg"
                className="font-display text-xs tracking-[0.2em] uppercase border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
              >
                Browse the Scenarios
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/40 tracking-wide">
            Free forever. No book required.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-primary/10 py-10 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Logo className="text-base text-primary/40" />
          <span className="font-display text-xs tracking-[0.15em] uppercase">
            Flagellum Dei TTRPG
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
