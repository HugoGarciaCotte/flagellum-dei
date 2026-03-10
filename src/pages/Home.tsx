import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAllScenarios } from "@/data/scenarios";
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
  Flame,
  Cross,
  ScrollText,
  Gift,
} from "lucide-react";
import Logo from "@/components/Logo";
import BrandTitle from "@/components/BrandTitle";

import heroImg from "@/assets/landing-hero.jpg";
import scenario1Img from "@/assets/landing-scenario-1.jpg";
import scenario2Img from "@/assets/landing-scenario-2.jpg";
import scenario3Img from "@/assets/landing-scenario-3.jpg";
import scriptoriumImg from "@/assets/landing-scriptorium.jpg";

/* ──────────────────────────────────────────────
   SUB-COMPONENTS
   ────────────────────────────────────────────── */

const scenarioImages = [scenario1Img, scenario2Img, scenario3Img];

const ClarityItem = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <div className="flex items-center gap-3 text-muted-foreground">
    <span className="text-primary">{icon}</span>
    <span className="font-display text-[11px] tracking-[0.2em] uppercase">
      {label}
    </span>
  </div>
);

const FeatureColumn = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) => (
  <div className="space-y-5 text-center">
    <div className="flex justify-center text-primary">{icon}</div>
    <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
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
  <div className="relative space-y-4 rounded-lg border border-border bg-card p-8 text-center border-t-2 border-t-primary/30">
    <span className="font-display text-5xl font-black text-primary/15">
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
  image,
}: {
  title: string;
  description: string;
  level?: number | null;
  image?: string;
}) => (
  <div className="group relative overflow-hidden rounded aged-border bg-card transition-all duration-300 hover:border-primary/40 gold-glow-box">
    {/* Scenario image */}
    <div className="relative h-48 overflow-hidden">
      {image ? (
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="h-full bg-gradient-to-b from-crimson/10 via-background/80 to-card" />
      )}
      {/* Vignette over image */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
    </div>
    <div className="space-y-3 p-6">
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
    q: "Is it really free? What's the catch?",
    a: "There is no catch. Flagellum Dei was created by history and tabletop lovers who simply wanted to share their passion. The game is completely free — no subscriptions, no paywalls, no hidden fees. If you'd like to thank us, please help spread the word.",
  },
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
    a: "No books, no paid addons. Everything you need — rules, character creation, scenarios, and game tools — is built directly into this website.",
  },
  {
    q: "Can we play online?",
    a: "Yes. While Flagellum Dei is designed for in-person play, you can connect through any video call platform. Each player opens the website on their device to access their character sheet and game tools.",
  },
  {
    q: "Does the game promote a particular faith?",
    a: "Not at all. Religion shaped every aspect of 14th-century life, so faith and heresy are central to the setting. The game explores these themes purely for historical immersion — the writers do not endorse or discriminate against any religion.",
  },
];

/* ──────────────────────────────────────────────
   SHOWCASE SCENARIOS (fallback if DB is empty)
   ────────────────────────────────────────────── */

const showcaseScenarios = [
  {
    title: "Danse Macabre Part 1",
    description:
      "An Austrian abbey hides ritualistic murders and the echo of a pagan curse buried beneath its foundations.",
    level: 1,
  },
  {
    title: "Danse Macabre Part 2",
    description:
      "A criminal syndicate thrives in the catacombs of Provins. The inquisitors must descend into darkness to root it out.",
    level: 2,
  },
  {
    title: "Danse Macabre Part 3",
    description:
      "A vengeful musician unleashes a mass dancing plague across Spain. Faith and madness blur.",
    level: 3,
  },
];

/* ──────────────────────────────────────────────
   HOME PAGE
   ────────────────────────────────────────────── */

const Home = () => {
  const allScenarios = getAllScenarios();
  const displayScenarios =
    allScenarios.length > 0 ? allScenarios : showcaseScenarios;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <BrandTitle />
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
        {/* Full background hero image */}
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Inquisitors walking through a plague-era medieval town at night"
            className="h-full w-full object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40 lg:via-background/75 lg:to-transparent" />
          {/* Bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        </div>

        <div className="container relative mx-auto px-6 lg:max-w-6xl">
          {/* Left — Text */}
          <div className="flex flex-col justify-center space-y-8 lg:max-w-xl lg:py-20">
            <p className="font-display text-[10px] tracking-[0.45em] uppercase text-primary/70">
              A Historical Horror Tabletop Role-Playing Game
            </p>
            <h1 className="font-display text-6xl font-black leading-[1.02] tracking-tight text-foreground md:text-7xl lg:text-8xl">
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
              <p className="font-display text-xl text-primary font-bold md:text-2xl">
                Fear what answers.
              </p>
            </div>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              A dark historical horror RPG where you become an inquisitor,
              interrogating heretics, uncovering blasphemous rituals, and
              confronting unspeakable dread during the Black Death. Gather 3–9
              players around a table, open the website, and begin your
              investigation. Entirely free.
            </p>
            <p className="max-w-lg text-sm text-muted-foreground/60">
              No books. No paid addons. Only the screams of the damned.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="font-display text-sm tracking-[0.2em] uppercase px-10 py-7 gold-glow gold-glow-box"
                >
                  Descend Into Darkness
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
            icon={<Wifi className="h-4 w-4" />}
            label="In Person or by Video Call"
          />
          <ClarityItem
            icon={<Globe className="h-4 w-4" />}
            label="Everything on the Website"
          />
          <ClarityItem
            icon={<Gift className="h-4 w-4" />}
            label="100% Free"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 3 — NOT FANTASY
          ═══════════════════════════════════════ */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(43_74%_49%/0.04)_0%,transparent_50%)]" />

        <div className="container relative mx-auto max-w-5xl">
          <div className="mb-20 text-center space-y-3">
            <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl leading-tight">
              Not fantasy.
              <br />
              <span className="text-primary">A descent into history.</span>
            </h2>
          </div>

          <div className="ornamental-divider mx-auto max-w-xs mb-20" />

          <div className="grid gap-16 md:grid-cols-3">
            <FeatureColumn
              icon={<span className="text-4xl">🜍</span>}
              title="Historically Grounded Horror"
              description={
                <p>
                  A decade of research across historical archives and scientific
                  publications. Real events, real figures, real institutions —
                  woven together with just enough artistic license to terrify.
                </p>
              }
            />
            <FeatureColumn
              icon={<span className="text-4xl">🜪</span>}
              title="Relentless Atmosphere"
              description={
                <p>
                  A real-time countdown drives every session. Events escalate
                  relentlessly, pressure never lifts, and every wasted minute
                  brings darker consequences.
                </p>
              }
            />
            <FeatureColumn
              icon={<span className="text-4xl">🜩</span>}
              title="Everything in the Website"
              description={
                <p>
                  No rulebooks to buy, no expansions to unlock. Characters,
                  scenarios, rules, music, and visuals — everything lives here,
                  entirely free.
                </p>
              }
            />
          </div>
        </div>
      </section>

      <div className="ornamental-divider mx-auto max-w-sm" />

      {/* ═══════════════════════════════════════
          SECTION 4 — HOW IT WORKS
          ═══════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="border-t border-primary/10 bg-card py-32 px-6"
      >
        <div className="container mx-auto max-w-4xl">
          <div className="mb-20 text-center space-y-4">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl">
              From First Click to First Investigation
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              number="I"
              title="Choose a Scenario"
              description={
                <p>
                  Begin the Danse Macabre — a 10-part campaign handwritten over a
                  decade of research. No AI, no filler. Every scenario was crafted
                  from historical archives, scientific publications, and obsessive
                  attention to detail.
                </p>
              }
            />
            <StepCard
              number="II"
              title="Join the Inquisition"
              description={
                <p>
                  Build characters directly on the website. Choose feats, shape
                  backstories. The rules are deliberately minimal — learn them in
                  seconds, then forget them. Every session belongs to atmosphere
                  and player choices, not rulebooks.
                </p>
              }
            />
            <StepCard
              number="III"
              title="Descend Into Darkness"
              description={
                <p>
                  Bring together 3–9 players around a table or connect through
                  video call. A built-in timer keeps the pressure mounting.
                  Every scenario ships with its own soundtrack and illustrated
                  scenes — full immersion guaranteed.
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
            <span className="mx-auto block text-3xl text-primary/40">🝳</span>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl">
              Open a Case. Enter a Nightmare.
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              80+ hours of gameplay. A decade of writing. Every word handwritten without AI — from Austrian abbeys to the shores of Rhodes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {displayScenarios.slice(0, 3).map((s, i) => (
              <ScenarioCard
                key={i}
                title={s.title}
                description={s.description ?? ""}
                level={s.level}
                image={scenarioImages[i]}
              />
            ))}
          </div>

          <p className="mt-12 text-center font-display text-sm tracking-[0.15em] uppercase text-primary/60">
            10 chapters · Austria · Provins · Castille · Marseille · Avignon · The Hundred Years' War · Isle of Man · Arabian Deserts · Rhodes
          </p>
        </div>
      </section>

      <div className="ornamental-divider mx-auto max-w-sm" />

      {/* ═══════════════════════════════════════
          SECTION 6 — DEPTH OF WRITING
          ═══════════════════════════════════════ */}
      <section className="relative border-t border-primary/10 py-32 px-6 overflow-hidden">
        {/* Scriptorium background */}
        <div className="absolute inset-0">
          <img
            src={scriptoriumImg}
            alt="Medieval scriptorium"
            className="h-full w-full object-cover opacity-15"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-background/80" />
        </div>

        <div className="container relative mx-auto max-w-3xl text-center space-y-10">
          <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl leading-tight">
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

          <blockquote className="font-display text-xl italic text-primary/70">
            "A decade of writing. 10 chapters across Europe and beyond — every scenario handwritten from historical research, not generated."
          </blockquote>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 7 — FAQ
          ═══════════════════════════════════════ */}
      <section className="border-t border-primary/10 py-32 px-6">
        <div className="container mx-auto max-w-2xl">
          <h2 className="mb-16 text-center font-display text-3xl font-bold text-foreground/80">
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
            <span className="text-primary">The heresy is waiting.</span>
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
          </div>

          <p className="text-xs text-muted-foreground/40 tracking-wide">
            Free forever. No book required.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-primary/10 py-10 text-center">
        <div className="ornamental-divider mx-auto max-w-xs mb-6" />
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
