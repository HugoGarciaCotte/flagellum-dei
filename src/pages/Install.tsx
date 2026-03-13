import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Download, Smartphone, Share, Monitor, Globe, WifiOff, Zap, Home } from "lucide-react";
import Logo from "@/components/Logo";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 safe-top" style={{ background: "radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.06) 0%, hsl(0 0% 7%) 70%)" }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Logo className="text-5xl mx-auto" />
          <h1 className="font-display text-3xl font-bold text-foreground">{t("install.title")}</h1>
          <p className="text-muted-foreground">{t("install.subtitle")}</p>
        </div>

        <div className="ornamental-divider w-48 mx-auto" />

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1.5">
            <WifiOff className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">{t("install.worksOffline")}</p>
          </div>
          <div className="space-y-1.5">
            <Home className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">{t("install.homeScreen")}</p>
          </div>
          <div className="space-y-1.5">
            <Zap className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">{t("install.fasterLoading")}</p>
          </div>
        </div>

        <Card className="aged-border bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" /> {t("install.getApp")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {installed ? (
              <p className="text-primary font-display text-center">{t("install.installed")}</p>
            ) : deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full gap-2 font-display">
                <Download className="h-4 w-4" /> {t("install.installNow")}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="font-display text-foreground text-sm">{t("install.chooseBrowser")}</p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="ios">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2"><Share className="h-4 w-4 text-primary" /> {t("install.safari")}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-sm">
                        <li dangerouslySetInnerHTML={{ __html: t("install.safariStep1") }} />
                        <li dangerouslySetInnerHTML={{ __html: t("install.safariStep2") }} />
                        <li dangerouslySetInnerHTML={{ __html: t("install.safariStep3") }} />
                      </ol>
                      <p className="text-xs text-muted-foreground/70 mt-3 italic">{t("install.safariNote")}</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="android">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> {t("install.chrome")}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-sm">
                        <li dangerouslySetInnerHTML={{ __html: t("install.chromeStep1") }} />
                        <li dangerouslySetInnerHTML={{ __html: t("install.chromeStep2") }} />
                        <li dangerouslySetInnerHTML={{ __html: t("install.chromeStep3") }} />
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="chrome-desktop">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /> {t("install.chromeDesktop")}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-sm">
                        <li dangerouslySetInnerHTML={{ __html: t("install.chromeDesktopStep1") }} />
                        <li dangerouslySetInnerHTML={{ __html: t("install.chromeDesktopStep2") }} />
                      </ol>
                      <p className="text-xs text-muted-foreground/70 mt-3 italic">{t("install.chromeDesktopAlt")}</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="edge">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> {t("install.edge")}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-sm">
                        <li dangerouslySetInnerHTML={{ __html: t("install.edgeStep1") }} />
                        <li dangerouslySetInnerHTML={{ __html: t("install.edgeStep2") }} />
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="firefox">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /> {t("install.firefox")}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t("install.firefoxNote") }} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="ghost" onClick={() => navigate("/")} className="w-full font-display">
          {t("install.back")}
        </Button>
      </div>
    </div>
  );
};

export default Install;
