import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Shield, Smartphone } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-primary mx-auto" />
          <h1 className="font-display text-3xl font-bold text-foreground">Install Prima TTRPG Helper</h1>
          <p className="text-muted-foreground">Play offline, anytime.</p>
        </div>

        <Card className="border-primary/20 bg-card/80 backdrop-blur">
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
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-display text-foreground text-base">To install:</p>
                <div className="space-y-2">
                  <p><strong>iPhone / iPad:</strong> Tap the Share button → "Add to Home Screen"</p>
                  <p><strong>Android:</strong> Tap the browser menu (⋮) → "Add to Home Screen" or "Install App"</p>
                  <p><strong>Desktop:</strong> Click the install icon in the address bar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="ghost" onClick={() => navigate("/")} className="w-full font-display">
          Back to Prima TTRPG Helper
        </Button>
      </div>
    </div>
  );
};

export default Install;
