import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const Auth = () => {
  const { user, isGuest, isLocalGuest, enterGuestMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isGuest) navigate("/", { replace: true });
  }, [user, isGuest, navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "A password reset link has been sent to your inbox." });
      setShowForgotPassword(false);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isGuest && !isLocalGuest) {
      // Convert real anonymous account to permanent
      const { error } = await supabase.auth.updateUser({
        email,
        password,
        data: { display_name: displayName },
      });
      if (error) {
        toast({ title: "Conversion failed", description: error.message, variant: "destructive" });
      } else {
        // Update profile display name
        await supabase
          .from("profiles")
          .update({ display_name: displayName })
          .eq("user_id", user!.id);
        toast({ title: "Account created!", description: "Your guest data has been preserved. Please check your email to verify your account." });
      }
    } else {
      // Standard signup (also handles local guests — their offline data used a fake UUID
      // and won't carry over, but the sync gate will have already attempted to upgrade them)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 safe-top" style={{ background: "radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.06) 0%, hsl(0 0% 7%) 70%)" }}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Logo className="text-5xl" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-wide">
            Flagellum Dei TTRPG
          </h1>
          <p className="text-muted-foreground text-lg">The Inquisition awaits</p>
        </div>

        <div className="ornamental-divider w-48 mx-auto" />

        <Card className="aged-border bg-card/80 backdrop-blur">
          <Tabs defaultValue={isGuest ? "signup" : "login"}>
            <CardHeader className="pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1 gap-2">
                  <span className="text-base" aria-hidden="true">🝉</span> Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 gap-2">
                  <Logo className="text-sm" /> Sign Up
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login">
                {showForgotPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-sm text-muted-foreground">Enter your email and we'll send you a link to reset your password.</p>
                    <Input placeholder="Email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                    <Button type="submit" className="w-full font-display" disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                    <button type="button" onClick={() => setShowForgotPassword(false)} className="text-sm text-primary hover:underline w-full text-center">
                      Back to Login
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <Button type="submit" className="w-full font-display" disabled={loading}>
                      {loading ? "Entering..." : "Enter the Realm"}
                    </Button>
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-primary hover:underline w-full text-center">
                      Forgot your password?
                    </button>
                    {!isGuest && (
                      <>
                        <div className="relative my-2">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
                          <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { enterGuestMode(); navigate("/"); }}
                          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors font-display flex items-center justify-center gap-2 py-2"
                        >
                          Explore as Guest
                        </button>
                      </>
                    )}
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  {isGuest && (
                    <p className="text-sm text-muted-foreground bg-primary/10 rounded p-2">
                      Converting your guest account — all your characters and progress will be kept!
                    </p>
                  )}
                  <Input placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <Button type="submit" className="w-full font-display" disabled={loading}>
                    {loading ? "Forging..." : isGuest ? "Convert to Full Account" : "Forge Your Legend"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
