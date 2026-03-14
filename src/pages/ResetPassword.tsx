import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: t("reset.toast.mismatch"), description: t("reset.toast.mismatchDesc"), variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: t("reset.toast.tooShort"), description: t("reset.toast.tooShortDesc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: t("reset.toast.failed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("reset.toast.success"), description: t("reset.toast.successDesc") });
      navigate("/");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 safe-top" style={{ background: "radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.06) 0%, hsl(0 0% 7%) 70%)" }}>
        <Card className="w-full max-w-md aged-border bg-card/80 backdrop-blur">
          <CardContent className="p-6 text-center space-y-4">
            <span className="text-4xl text-muted-foreground mx-auto block text-center" aria-hidden="true">🜐</span>
            <p className="text-muted-foreground">{t("reset.noSession")}</p>
            <Button variant="outline" onClick={() => navigate("/auth")} className="font-display">
              {t("reset.returnToLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 safe-top" style={{ background: "radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.06) 0%, hsl(0 0% 7%) 70%)" }}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <span className="text-4xl text-primary" aria-hidden="true">🝒</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-wide">
            {t("reset.title")}
          </h1>
          <p className="text-muted-foreground text-lg">{t("reset.subtitle")}</p>
        </div>

        <div className="ornamental-divider w-48 mx-auto" />

        <Card className="aged-border bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-foreground font-display text-lg">
              <span className="text-lg text-primary" aria-hidden="true">🜐</span> {t("reset.setNew")}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                placeholder={t("reset.newPassword")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                placeholder={t("reset.confirmPassword")}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full font-display" disabled={loading}>
                {loading ? t("reset.forging") : t("reset.reforge")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
