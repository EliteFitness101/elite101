import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff, Sparkles } from "lucide-react";

const signUpSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(1).max(80),
  role: z.enum(["model", "brand"]),
});
const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = (params.get("role") === "brand" ? "brand" : "model") as "model" | "brand";
  const allowedIntents = ["start-earning", "earn-from-home", "work-from-home", "student-support", "soft-loan-enquiry", "become-model", "book-talent"] as const;
  const requestedIntent = params.get("intent") ?? "become-model";
  const interestIntent = (allowedIntents as readonly string[]).includes(requestedIntent) ? requestedIntent : "become-model";
  const intentLabels: Record<string, string> = {
    "start-earning": "Start earning as a creator",
    "earn-from-home": "Explore earning from home",
    "work-from-home": "Explore creator work from home",
    "student-support": "Student support enquiry",
    "soft-loan-enquiry": "Soft-loan enquiry",
    "become-model": "Become a model or creator",
    "book-talent": "Book talent for a brand",
  };
  const { user, roles, refreshRoles } = useAuth();

  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [role, setRole] = useState<"model" | "brand">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(params.get("mode") === "reset");
  const [resetRequested, setResetRequested] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!resetMode && user && roles.length > 0) {
      navigate(roles.includes("brand") ? "/dashboard/brand" : "/dashboard/model", { replace: true });
    }
  }, [user, roles, navigate, resetMode]);

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ email, password, displayName, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: parsed.data.displayName, app_role: parsed.data.role, interest_intent: interestIntent },
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data.user && !data.session) {
      setVerificationEmail(parsed.data.email);
      toast.success("Account created. Check your email for a verification link before signing in.");
      setTab("signin");
    } else if (data.user && data.session) {
      toast.success("Welcome to Elite NG!");
      await refreshRoles();
      navigate(parsed.data.role === "brand" ? "/onboarding/brand" : "/onboarding/model", { replace: true });
    }
    setLoading(false);
  };

  const onForgotPassword = async () => {
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast.error("Enter your email address first.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    if (error) toast.error(error.message);
    else {
      setResetRequested(true);
      toast.success("If an account exists for that email, a password reset link has been sent.");
    }
    setLoading(false);
  };

  const onUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || password.length > 72) {
      toast.error("Password must be between 8 and 72 characters.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated. You can now continue securely.");
      setResetMode(false);
      setTab("signin");
      setPassword("");
      navigate("/auth", { replace: true });
    }
    setLoading(false);
  };

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gold" />
          <span className="font-display text-xl">ELITE <span className="text-gradient-gold">NG</span></span>
        </Link>
      </div>
      <div className="w-full max-w-md glass-strong rounded-3xl p-8">
        <h1 className="font-display text-3xl text-center mb-2">Welcome</h1>
        <p className="text-center text-muted-foreground text-sm mb-6">
          {intentLabels[interestIntent]} · Africa's ResoFlex™ powered talent marketplace
        </p>

        {verificationEmail && !resetMode && (
          <div role="status" aria-live="polite" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
            <h2 className="mb-1 font-semibold text-foreground">Check your email to verify your account</h2>
            <p className="text-muted-foreground">
              We sent a verification link to <strong className="break-all text-foreground">{verificationEmail}</strong>.
              Open that link before signing in. If it is not in your inbox, check your spam or junk folder.
            </p>
            <button type="button" onClick={() => { setTab("signin"); setVerificationEmail(null); }} className="mt-3 text-gold underline underline-offset-4">
              I have verified my email — continue to sign in
            </button>
          </div>
        )}

        {resetMode ? (
          <form onSubmit={onUpdatePassword} className="space-y-4">
            <h2 className="text-xl text-center">Set a new password</h2>
            <p className="text-sm text-muted-foreground text-center">Choose a strong password of at least 8 characters.</p>
            <div>
              <Label>New password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" autoComplete="new-password" required />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gold text-primary-foreground">{loading ? "Updating..." : "Update password"}</Button>
          </form>
        ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "signup" | "signin")}>
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="signup">Sign up</TabsTrigger>
            <TabsTrigger value="signin">Sign in</TabsTrigger>
          </TabsList>

          <TabsContent value="signup">
            <form onSubmit={onSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(["model", "brand"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-xl p-3 text-sm capitalize border transition ${
                      role === r
                        ? "bg-gold text-primary-foreground border-gold glow-gold"
                        : "glass border-border hover:border-gold/40"
                    }`}
                  >
                    I'm a {r}
                  </button>
                ))}
              </div>
              <div>
                <Label>Display name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name or brand" required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" autoComplete="new-password" required />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gold text-primary-foreground hover:opacity-90 glow-gold">
                {loading ? "Creating..." : `Create ${role} account`}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signin">
            <form onSubmit={onSignIn} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gold text-primary-foreground hover:opacity-90">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={onForgotPassword} disabled={loading || resetRequested} className="text-gold underline-offset-4 hover:underline disabled:opacity-60">
                  {resetRequested ? "Reset link requested" : "Forgot password?"}
                </button>
                <button type="button" onClick={() => { setTab("signup"); setResetRequested(false); }} className="text-muted-foreground hover:text-foreground">Create account</button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
        )}
      </div>
    </div>
  );
};

export default Auth;
