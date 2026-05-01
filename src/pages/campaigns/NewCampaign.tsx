import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  brief: z.string().trim().min(10).max(1500),
  category: z.enum(["Platinum", "Commercial", "Influencer", "Training"]),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  budget_ngn: z.coerce.number().int().min(10000),
  shoot_date: z.string().min(1),
  slots: z.coerce.number().int().min(1).max(20),
});

const NewCampaign = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", brief: "", category: "Commercial", city: "Lagos", state: "Lagos",
    budget_ngn: 50000, shoot_date: "", slots: 1,
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("brands").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setBrandId(data.id);
      else navigate("/onboarding/brand");
    });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { data, error } = await supabase.from("campaigns").insert({ brand_id: brandId, ...parsed.data }).select().single();
    if (error) { toast.error(error.message); setLoading(false); return; }
    // Trigger matching
    const { error: mErr } = await supabase.functions.invoke("match-models", { body: { campaign_id: data.id } });
    if (mErr) toast.warning("Campaign created. Matching can be re-run from the campaign page.");
    else toast.success("Campaign created and matched!");
    navigate(`/campaigns/${data.id}/matches`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl py-10">
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-gold">New Campaign</div>
          <h1 className="font-display text-4xl mt-1">Brief your shoot</h1>
        </div>
        <form onSubmit={onSubmit} className="glass-strong rounded-3xl p-6 md:p-8 space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. SS26 Lookbook" />
          </div>
          <div>
            <Label>Brief</Label>
            <Textarea rows={4} value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="Mood, deliverables, requirements..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Platinum", "Commercial", "Influencer", "Training"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Slots</Label>
              <Input type="number" min={1} value={form.slots} onChange={(e) => setForm({ ...form, slots: +e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budget (₦, per model)</Label>
              <Input type="number" min={10000} step={1000} value={form.budget_ngn} onChange={(e) => setForm({ ...form, budget_ngn: +e.target.value })} />
            </div>
            <div>
              <Label>Shoot date</Label>
              <Input type="date" value={form.shoot_date} onChange={(e) => setForm({ ...form, shoot_date: e.target.value })} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gold text-primary-foreground hover:opacity-90 glow-gold">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Matching talent...</> : "Create & match"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewCampaign;
