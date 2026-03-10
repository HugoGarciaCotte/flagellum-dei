import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Download, Smartphone, Share, Monitor, Globe, WifiOff, Zap, Home } from "lucide-react";
import Logo from "@/components/Logo";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

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
          <h1 className="font-display text-3xl font-bold text-foreground">Install Flagellum Dei TTRPG</h1>
          <p className="text-muted-foreground">Play offline, anytime.</p>
        </div>

        <div className="ornamental-divider w-48 mx-auto" />

        {/* Why install? */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1.5">
            <WifiOff className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Works offline</p>
          </div>
          <div className="space-y-1.5">
            <Home className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Home screen launch</p>
          </div>
          <div className="space-y-1.5">
            <Zap className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Faster loading</p>
          </div>
        </div>

        <Card className="aged-border bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" /> Get the App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {installed ? (
              <p className="text-primary font-display text-center">✓ App is installed!</p>
            ) : deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full gap-2 font-display">
                <Download className="h-4 w-4" /> Install Now
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="font-display text-foreground text-sm">Choose your browser for step-by-step instructions:</p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="ios">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <Share className="h-4 w-4 text-primary" /> Safari (iPhone / iPad)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-sm">
                        <li>Tap the <strong className="text-foreground">Share</strong> button (square with arrow) at the bottom of Safari</li>
                        <li>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></li>
                        <li>Tap <strong className="text-foreground">"Add"</strong> in the top right</li>
                      </ol>
                      <p className="text-xs text-muted-foreground/70 mt-3 italic">
                        Note: You must use Safari — Chrome and Firefox on iOS don't support app installation.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="android">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" /> Chrome (Android)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-sm">
                        <li>Tap the <strong className="text-foreground">three-dot menu</strong> (⋮) in the top right</li>
                        <li>Tap <strong className="text-foreground">"Add to Home Screen"</strong> or <strong className="text-foreground">"Install App"</strong></li>
                        <li>Confirm by tapping <strong className="text-foreground">"Install"</strong> or <strong className="text-foreground">"Add"</strong></li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="chrome-desktop">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-primary" /> Chrome (Desktop)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-sm">
                        <li>Look for the <strong className="text-foreground">install icon</strong> (⊕) in the address bar on the right</li>
                        <li>Click <strong className="text-foreground">"Install"</strong></li>
                      </ol>
                      <p className="text-xs text-muted-foreground/70 mt-3 italic">
                        Alt: Menu (⋮) → "Save and share" → "Install page as app"
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="edge">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" /> Microsoft Edge
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-sm">
                        <li>Click the <strong className="text-foreground">three-dot menu</strong> (⋯) in the top right</li>
                        <li>Go to <strong className="text-foreground">"Apps"</strong> → <strong className="text-foreground">"Install this site as an app"</strong></li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="firefox">
                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" /> Firefox
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground">
                        Firefox doesn't support PWA installation natively. Please use <strong className="text-foreground">Chrome</strong> or <strong className="text-foreground">Edge</strong> instead.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="ghost" onClick={() => navigate("/")} className="w-full font-display">
          Back to Flagellum Dei TTRPG
        </Button>
      </div>
    </div>
  );
};

export default Install;
