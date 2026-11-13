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
  const [careerChoices, setCareerChoices] = useState("");
  const [personalGoals, setPersonalGoals] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [socialUrls, setSocialUrls] = useState({ instagram: "", tiktok: "", youtube: "", facebook: "", pinterest: "", x: "", linkedin: "", google: "" });
  const [socialReviewConsent, setSocialReviewConsent] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramOptIn, setTelegramOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"loading" | "saved" | "saving" | "error">("loading");

  useEffect(() => {
    if (!user) return;
    let active = true;
    (supabase as any).from("brand_onboarding_drafts")
      .select("payload")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (!active) return;
        if (error) {
          console.error("Unable to restore brand onboarding draft:", error);
          setDraftStatus("error");
          setDraftHydrated(true);
          return;
        }
        const p = data?.payload;
        if (p?.form) setForm((current) => ({ ...current, ...p.form }));
        if (typeof p?.careerChoices === "string") setCareerChoices(p.careerChoices);
        if (typeof p?.personalGoals === "string") setPersonalGoals(p.personalGoals);
        if (typeof p?.portfolioUrl === "string") setPortfolioUrl(p.portfolioUrl);
        if (p?.socialUrls && typeof p.socialUrls === "object") setSocialUrls((current) => ({ ...current, ...p.socialUrls }));
        setSocialReviewConsent(p?.socialReviewConsent === true);
        setWhatsappOptIn(p?.whatsappOptIn === true);
        if (typeof p?.telegramChatId === "string") setTelegramChatId(p.telegramChatId);
        setTelegramOptIn(p?.telegramOptIn === true);
        setDraftStatus("saved");
        setDraftHydrated(true);
      })
      .catch((restoreFailure: any) => {
        if (!active) return;
        console.error("Brand onboarding draft restore failed:", restoreFailure);
        setDraftStatus("error");
        setDraftHydrated(true);
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !draftHydrated || loading) return;
    let active = true;
    setDraftStatus("saving");
    const timer = window.setTimeout(async () => {
      const payload = {
        form, careerChoices, personalGoals, portfolioUrl, socialUrls,
        socialReviewConsent, whatsappOptIn, telegramChatId, telegramOptIn,
      };
      try {
        const { error } = await (supabase as any).from("brand_onboarding_drafts").upsert({
          user_id: user.id, payload, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (!active) return;
        setDraftStatus(error ? "error" : "saved");
        if (error) console.error("Brand onboarding autosave failed:", error);
      } catch (saveFailure) {
        if (!active) return;
        console.error("Brand onboarding autosave failed:", saveFailure);
        setDraftStatus("error");
      }
    }, 700);
    return () => { active = false; window.clearTimeout(timer); };
  }, [user, draftHydrated, loading, form, careerChoices, personalGoals, portfolioUrl,
      socialUrls, socialReviewConsent, whatsappOptIn, telegramChatId, telegramOptIn]);

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
    const { data: existingBrand, error: existingBrandError } = await supabase
      .from("brands").select("id").eq("user_id", user.id).maybeSingle();
    if (existingBrandError) {
      toast.error(existingBrandError.message);
      setLoading(false);
      return;
    }
    let brandId = existingBrand?.id ?? null;
    if (!brandId) {
      const { data: createdBrand, error: createError } = await supabase
        .from("brands").insert({ user_id: user.id, ...parsed.data } as any).select("id").single();
      if (createError) {
        toast.error(createError.message);
        setLoading(false);
        return;
      }
      brandId = createdBrand.id;
    }
    {
      try {
        const { error: intelligenceError } = await supabase.functions.invoke("chatb2k-talent-intelligence", {
          body: {
            profile_type: "brand",
            source_id: brandId,
            profile: {
              display_name: parsed.data.name,
              email: user.email,
              industry: parsed.data.industry,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              preferred_language: navigator.language || "en",
              preferred_channels: ["whatsapp", "telegram"],
              career_choices: careerChoices.split(",").map((v) => v.trim()).filter(Boolean),
              goals: personalGoals.split(/\r?\n/).map((v) => v.trim()).filter(Boolean),
              portfolio: { portfolio_url: portfolioUrl || null },
              whatsapp_opt_in: whatsappOptIn,
              telegram_chat_id: telegramChatId.trim(),
              telegram_opt_in: telegramOptIn,
              social_review_consent: socialReviewConsent,
              social_profiles: Object.entries(socialUrls).map(([platform, url]) => ({ platform, url })).concat([{ platform: "Portfolio", url: portfolioUrl }]).filter((s) => s.url),
            },
          },
        });
        if (intelligenceError) toast.warning("Brand profile saved. ChatB2K enrichment will retry when its service is available.");
        else toast.success("Brand created and connected to ChatB2K intelligence.");

      } catch (intelligenceFailure) {
        console.error("ChatB2K brand enrichment unavailable:", intelligenceFailure);
        toast.warning("Brand saved. ChatB2K enrichment will retry when its service is available.");
      }
      await (supabase as any).from("brand_onboarding_drafts").delete().eq("user_id", user.id);
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
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{draftStatus === "saving" ? "Saving your progress…" : draftStatus === "saved" ? "Your progress is saved securely" : draftStatus === "error" ? "Autosave unavailable — keep this page open and retry" : "Restoring your saved progress…"}</p>
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
          <div>
            <Label>Career / growth interests (comma-separated)</Label>
            <Input value={careerChoices} onChange={(e) => setCareerChoices(e.target.value)} placeholder="Brand partnerships, creator campaigns, retail..." />
          </div>
          <div>
            <Label>Business and personal goals (one per line)</Label>
            <textarea className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={personalGoals} onChange={(e) => setPersonalGoals(e.target.value)} placeholder="Enter goals ChatB2K should use for recommendations" />
          </div>
          <div>
            <Label>Website / portfolio URL</Label>
            <Input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["instagram","tiktok","youtube","facebook","pinterest","x","linkedin","google"] as const).map((platform) => (
              <div key={platform}>
                <Label>{platform === "x" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1)} profile URL</Label>
                <Input type="url" value={socialUrls[platform]} onChange={(e) => setSocialUrls({ ...socialUrls, [platform]: e.target.value })} placeholder="https://..." />
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={socialReviewConsent} onChange={(e) => setSocialReviewConsent(e.target.checked)} className="mt-1" /><span>I consent to ChatB2K reviewing the public links I provide. This does not grant account access or verify identity.</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} className="mt-1" /><span>I agree to receive onboarding and business follow-up messages on WhatsApp. I can withdraw consent at any time.</span></label>
          <div>
            <Label>Telegram chat ID (optional)</Label>
            <Input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Add after you have started our Telegram bot" />
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={telegramOptIn} onChange={(e) => setTelegramOptIn(e.target.checked)} className="mt-1" /><span>I agree to receive onboarding and business follow-up messages from our Telegram bot. I can withdraw consent at any time.</span></label>
          <Button type="submit" disabled={loading} className="w-full bg-neon text-accent-foreground hover:opacity-90 glow-neon">
            {loading ? "Creating..." : "Create brand"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BrandOnboarding;
