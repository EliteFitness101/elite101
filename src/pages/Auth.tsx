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
import { Sparkles } from "lucide-react";

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
  const { user, roles, refreshRoles } = useAuth();

  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [role, setRole] = useState<"model" | "brand">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && roles.length > 0) {
      navigate(roles.includes("brand") ? "/dashboard/brand" : "/dashboard/model", { replace: true });
    }
  }, [user, roles, navigate]);

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
        data: { display_name: parsed.data.displayName },
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: parsed.data.role });
      if (roleErr) {
        toast.error("Account created but role assignment failed: " + roleErr.message);
      } else {
        toast.success("Welcome to Elite NG!");
        await refreshRoles();
        navigate(parsed.data.role === "brand" ? "/onboarding/brand" : "/onboarding/model", { replace: true });
      }
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
          Africa's ResoFlex™ Powered modeling marketplace
        </p>

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
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required />
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
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gold text-primary-foreground hover:opacity-90">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
