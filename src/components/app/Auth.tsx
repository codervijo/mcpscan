import { useState, useEffect } from "react";
import { useNavigate, Link } from "@/lib/router-compat";
import { Shell } from "@/components/stricture/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";

function Auth() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user && !loading) nav("/dashboard"); }, [user, loading, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="container max-w-md py-20">
        <div className="rounded-md border border-border bg-card p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">{mode === "signin" ? "Sign in to Stricture" : "Create your Stricture account"}</h1>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {mode === "signin" ? (
              <>No account? <button className="text-primary" onClick={() => setMode("signup")}>Sign up</button></>
            ) : (
              <>Have an account? <button className="text-primary" onClick={() => setMode("signin")}>Sign in</button></>
            )}
          </div>
          <div className="mt-6 text-center"><Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back</Link></div>
        </div>
      </div>
    </Shell>
  );
}

export default function AuthPage() {
  return <AppFrame><Auth /></AppFrame>;
}
