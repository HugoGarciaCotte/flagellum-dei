import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Shield, Sword } from "lucide-react";

const Auth = () => {
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link." });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-wide">
            Quest Scroll
          </h1>
          <p className="text-muted-foreground text-lg">Your adventure awaits</p>
        </div>

        <Card className="border-primary/20 bg-card/80 backdrop-blur">
          <Tabs defaultValue="login">
            <CardHeader className="pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1 gap-2">
                  <Sword className="h-4 w-4" /> Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 gap-2">
                  <Shield className="h-4 w-4" /> Sign Up
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
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <Input placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <Button type="submit" className="w-full font-display" disabled={loading}>
                    {loading ? "Forging..." : "Forge Your Legend"}
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
