import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
  Smartphone,
} from "lucide-react";
import Logo from "@/components/Logo";
import BrandTitle from "@/components/BrandTitle";
import { useTranslation } from "@/i18n/useTranslation";

import heroImg from "@/assets/landing-hero.jpg";
import scenario1Img from "@/assets/landing-scenario-1.jpg";
import scenario2Img from "@/assets/landing-scenario-2.jpg";
import scenario3Img from "@/assets/landing-scenario-3.jpg";
import scriptoriumImg from "@/assets/landing-scriptorium.jpg";

import scenarioWarImg from "@/assets/landing-scenario-war.jpg";

const scenarioImages = [scenario2Img, scenarioWarImg, scenario3Img];

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
  chapterLabel,
  date,
}: {
  title: string;
  description: string;
  level?: number | null;
  image?: string;
  chapterLabel: string;
  date?: string;
}) => (
  <div className="group relative overflow-hidden rounded aged-border bg-card transition-all duration-300 hover:border-primary/40 gold-glow-box">
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
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
    </div>
    <div className="space-y-3 p-6">
      {level != null && (
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[10px] tracking-[0.3em] uppercase text-primary/50">
            {chapterLabel} {level}
          </span>
          {date && (
            <span className="font-display text-[10px] tracking-wide text-muted-foreground/50 italic">
              {date}
            </span>
          )}
        </div>
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

const showcaseScenarios = [
  {
    title: "Societas Templois",
    description:
      "A string of mysterious deaths haunts the Habsburg family, their trail leading to a secluded Austrian abbey — once the seat of a long-dead secret society. They believed they had sealed away their curse. But how long can anyone run from the Devil?",
    level: 1,
    date: "11th of December, 1344",
  },
  {
    title: "La Dama De Blanco",
    description:
      "With faded tulips in her hair she dances every week. Her soul was the prize for her immortal love. How many will be the victims of her selfish heart?",
    level: 3,
  },
  {
    title: "The Mad King",
    description:
      "Lost in the wastes of the Arabian desert, a company of Knights Templar uncovers a primordial, biblical secret—a horror that will plunge the world into endless madness.",
    level: 9,
    date: "6th of October, 1241",
  },
];

const faqLinks: Record<number, { lovable?: string; github?: string }> = {
  8: {
    lovable: "https://lovable.dev/projects/81d72331-f39f-42a0-8104-483bc69c26ee",
    github: "https://github.com/HugoGarciaCotte/flagellum-dei",
  },
};

const Home = () => {
  const { t } = useTranslation();
  const displayScenarios = showcaseScenarios;

  const faqCount = 11; // q0..q10

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <BrandTitle />
          <Link to="/auth">
            <Button
              size="sm"
              className="font-display text-xs tracking-[0.2em] uppercase"
            >
              {t("home.header.play")}
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center pt-20">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Inquisitors walking through a plague-era medieval town at night"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40 lg:via-background/75 lg:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        </div>

        <div className="container relative mx-auto px-6 lg:max-w-6xl">
          <div className="flex flex-col justify-center space-y-8 lg:max-w-xl lg:py-20">
            <p className="font-display text-[10px] tracking-[0.45em] uppercase text-primary/70">
              {t("home.hero.tagline")}
            </p>
            <h1 className="font-display text-6xl font-black leading-[1.02] tracking-tight text-foreground md:text-7xl lg:text-8xl">
              FLAGELLUM
              <br />
              <span className="text-primary">DEI</span>
            </h1>
            <div className="space-y-1">
              <p className="font-display text-xl text-foreground/90 md:text-2xl">
                {t("home.hero.enter")}
              </p>
              <p className="font-display text-xl text-foreground/90 md:text-2xl">
                {t("home.hero.judge")}
              </p>
              <p className="font-display text-xl text-primary font-bold md:text-2xl">
                {t("home.hero.fear")}
              </p>
            </div>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              {t("home.hero.description")}
            </p>
            <p className="max-w-lg text-sm text-muted-foreground/60">
              {t("home.hero.subtext")}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="font-display text-sm tracking-[0.2em] uppercase px-10 py-7 gold-glow gold-glow-box"
                >
                  {t("home.hero.cta")}
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="font-display text-xs tracking-[0.2em] uppercase border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
                >
                  {t("home.hero.how")}
                </Button>
              </a>
            </div>

            <p className="text-xs text-muted-foreground/40 tracking-wide">
              {t("home.hero.meta")}
            </p>
          </div>
        </div>
      </section>

      {/* CLARITY STRIP */}
      <section className="border-y border-primary/10 bg-card py-8">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-8 px-6 md:gap-14">
          <ClarityItem icon={<BookOpen className="h-4 w-4" />} label={t("home.clarity.ttrpg")} />
          <ClarityItem icon={<Wifi className="h-4 w-4" />} label={t("home.clarity.inperson")} />
          <ClarityItem icon={<Globe className="h-4 w-4" />} label={t("home.clarity.website")} />
          <ClarityItem icon={<Gift className="h-4 w-4" />} label={t("home.clarity.free")} />
        </div>
      </section>

      {/* NOT FANTASY */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(43_74%_49%/0.04)_0%,transparent_50%)]" />
        <div className="container relative mx-auto max-w-5xl">
          <div className="mb-20 text-center space-y-3">
            <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl leading-tight">
              {t("home.notfantasy.title1")}
              <br />
              <span className="text-primary">{t("home.notfantasy.title2")}</span>
            </h2>
          </div>
          <div className="ornamental-divider mx-auto max-w-xs mb-20" />
          <div className="grid gap-16 md:grid-cols-3">
            <FeatureColumn
              icon={<span className="text-4xl">🜍</span>}
              title={t("home.notfantasy.col1.title")}
              description={<p>{t("home.notfantasy.col1.desc")}</p>}
            />
            <FeatureColumn
              icon={<span className="text-4xl">🜪</span>}
              title={t("home.notfantasy.col2.title")}
              description={<p>{t("home.notfantasy.col2.desc")}</p>}
            />
            <FeatureColumn
              icon={<span className="text-4xl">🜩</span>}
              title={t("home.notfantasy.col3.title")}
              description={<p>{t("home.notfantasy.col3.desc")}</p>}
            />
          </div>
        </div>
      </section>

      <div className="ornamental-divider mx-auto max-w-sm" />

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-t border-primary/10 bg-card py-32 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-20 text-center space-y-4">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl">
              {t("home.howitworks.title")}
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard number="I" title={t("home.howitworks.step1.title")} description={<p>{t("home.howitworks.step1.desc")}</p>} />
            <StepCard number="II" title={t("home.howitworks.step2.title")} description={<p>{t("home.howitworks.step2.desc")}</p>} />
            <StepCard number="III" title={t("home.howitworks.step3.title")} description={<p>{t("home.howitworks.step3.desc")}</p>} />
          </div>
        </div>
      </section>

      {/* SCENARIO SHOWCASE */}
      <section className="border-t border-primary/10 py-32 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-20 text-center space-y-4">
            <span className="mx-auto block text-3xl text-primary/40">🝳</span>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl">
              {t("home.scenarios.title")}
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              {t("home.scenarios.subtitle")}
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
                chapterLabel={t("home.scenarios.chapter")}
                date={(s as any).date}
              />
            ))}
          </div>
          <p className="mt-12 text-center font-display text-sm tracking-[0.15em] uppercase text-primary/60">
            {t("home.scenarios.locations")}
          </p>
        </div>
      </section>

      <div className="ornamental-divider mx-auto max-w-sm" />

      {/* DEPTH OF WRITING */}
      <section className="relative border-t border-primary/10 py-32 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <img src={scriptoriumImg} alt="Medieval scriptorium" className="h-full w-full object-cover opacity-15" loading="lazy" />
          <div className="absolute inset-0 bg-background/80" />
        </div>
        <div className="container relative mx-auto max-w-3xl text-center space-y-10">
          <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl leading-tight">
            {t("home.depth.title1")}
            <br />
            <span className="text-primary">{t("home.depth.title2")}</span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t("home.depth.desc")}
          </p>
          <div className="ornamental-divider mx-auto max-w-xs" />
          <blockquote className="font-display text-xl italic text-primary/70">
            {t("home.depth.quote")}
          </blockquote>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-primary/10 py-32 px-6">
        <div className="container mx-auto max-w-2xl">
          <h2 className="mb-16 text-center font-display text-3xl font-bold text-foreground/80">
            {t("home.faq.title")}
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {Array.from({ length: faqCount }, (_, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/50 px-2">
                <AccordionTrigger className="font-display text-sm tracking-wide text-foreground/90 hover:no-underline hover:text-primary text-left">
                  {t(`home.faq.q${i}`)}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground space-y-2">
                  <p dangerouslySetInnerHTML={{ __html: t(`home.faq.a${i}`) }} />
                  {faqLinks[i] && (
                    <p className="flex gap-4">
                      {faqLinks[i].lovable && (
                        <a href={faqLinks[i].lovable} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Remix on Lovable ↗
                        </a>
                      )}
                      {faqLinks[i].github && (
                        <a href={faqLinks[i].github} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View on GitHub ↗
                        </a>
                      )}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative border-t border-primary/10 py-40 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(0_70%_18%/0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(43_74%_49%/0.06)_0%,transparent_40%)]" />
        <div className="relative mx-auto max-w-xl space-y-8">
          <Logo className="mx-auto text-5xl text-primary/30" />
          <h2 className="font-display text-3xl font-bold text-foreground md:text-5xl leading-tight">
            {t("home.cta.title1")}
            <br />
            <span className="text-primary">{t("home.cta.title2")}</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth">
              <Button size="lg" className="font-display text-sm tracking-[0.2em] uppercase px-10 py-7 gold-glow gold-glow-box">
                {t("home.cta.button")}
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/40 tracking-wide">
            {t("home.cta.subtext")}
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-primary/10 py-10 text-center space-y-4">
        <div className="ornamental-divider mx-auto max-w-xs mb-6" />
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Logo className="text-base text-primary/40" />
          <span className="font-display text-xs tracking-[0.15em] uppercase">
            {t("home.footer.brand")}
          </span>
        </div>
        {!window.matchMedia('(display-mode: standalone)').matches && (
          <p>
            <Link to="/install" className="text-xs text-muted-foreground/50 hover:text-primary transition-colors font-display">
              {t("home.footer.install")}
            </Link>
          </p>
        )}
      </footer>
    </div>
  );
};

export default Home;
