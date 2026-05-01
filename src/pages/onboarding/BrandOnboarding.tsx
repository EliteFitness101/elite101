import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  industry: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
});

const BrandOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", industry: "Fashion", city: "Lagos" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("brands").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) navigate("/dashboard/brand", { replace: true });
    });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.from("brands").insert({ user_id: user.id, ...parsed.data } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Brand created!");
      navigate("/dashboard/brand");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-md py-12">
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-neon mb-2">Brand Setup</div>
          <h1 className="font-display text-4xl">Create your brand</h1>
        </div>
        <form onSubmit={onSubmit} className="glass-strong rounded-3xl p-6 md:p-8 space-y-4">
          <div>
            <Label>Brand name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Fashion, Beauty, etc." />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-neon text-accent-foreground hover:opacity-90 glow-neon">
            {loading ? "Creating..." : "Create brand"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BrandOnboarding;
