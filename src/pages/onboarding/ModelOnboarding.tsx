import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { Upload, X, Loader2, Sparkles } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  age: z.coerce.number().int().min(16).max(80),
  gender: z.string().min(1).max(30),
  phone: z.string().trim().min(7).max(20),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  instagram: z.string().trim().min(1).max(60),
  tiktok: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().min(20).max(800),
});

const ModelOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    age: "" as string | number,
    gender: "",
    phone: "",
    city: "Lagos",
    state: "Lagos",
    instagram: "",
    tiktok: "",
    bio: "",
  });
  const [photos, setPhotos] = useState<{ name: string; storage_path: string; preview_url: string }[]>([]);
  const [careerChoices, setCareerChoices] = useState("");
  const [personalGoals, setPersonalGoals] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [pinterestUrl, setPinterestUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [socialReviewConsent, setSocialReviewConsent] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramOptIn, setTelegramOptIn] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"loading" | "saved" | "saving" | "error">("loading");

  // Drafts are private to the authenticated owner; no form data is stored in browser localStorage.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (supabase as any).from("model_onboarding_drafts")
      .select("payload,current_step")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data, error }: any) => {
        if (!active) return;
        if (error) {
          console.error("Unable to restore onboarding draft:", error);
          setDraftStatus("error");
          setDraftHydrated(true);
          return;
        }
        if (data?.payload) {
          const p = data.payload;
          if (p.form) setForm((current) => ({ ...current, ...p.form }));
          if (typeof p.careerChoices === "string") setCareerChoices(p.careerChoices);
          if (typeof p.personalGoals === "string") setPersonalGoals(p.personalGoals);
          if (typeof p.portfolioUrl === "string") setPortfolioUrl(p.portfolioUrl);
          if (typeof p.youtubeUrl === "string") setYoutubeUrl(p.youtubeUrl);
          if (typeof p.facebookUrl === "string") setFacebookUrl(p.facebookUrl);
          if (typeof p.pinterestUrl === "string") setPinterestUrl(p.pinterestUrl);
          if (typeof p.xUrl === "string") setXUrl(p.xUrl);
          if (typeof p.linkedinUrl === "string") setLinkedinUrl(p.linkedinUrl);
          if (typeof p.googleUrl === "string") setGoogleUrl(p.googleUrl);
          if (Array.isArray(p.photoPaths)) {
            const restored = await Promise.all(p.photoPaths.map(async (storage_path: string) => {
              const { data: signed } = await supabase.storage.from("model-photos").createSignedUrl(storage_path, 3600);
              return signed?.signedUrl ? { name: storage_path.split("/").pop() || "Portfolio photo", storage_path, preview_url: signed.signedUrl } : null;
            }));
            if (active) setPhotos(restored.filter(Boolean) as { name: string; storage_path: string; preview_url: string }[]);
          }
          setSocialReviewConsent(p.socialReviewConsent === true);
          setWhatsappOptIn(p.whatsappOptIn === true);
          if (typeof p.telegramChatId === "string") setTelegramChatId(p.telegramChatId);
          setTelegramOptIn(p.telegramOptIn === true);
          if (Number.isInteger(data.current_step)) setStep(data.current_step);
        }
        setDraftStatus("saved");
        setDraftHydrated(true);
      }).catch((restoreFailure: any) => {
        if (!active) return;
        console.error("Onboarding draft restore failed:", restoreFailure);
        setDraftStatus("error");
        setDraftHydrated(true);
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !draftHydrated || submitting) return;
    setDraftStatus("saving");
    let active = true;
    const timer = window.setTimeout(async () => {
      const payload = {
        form, careerChoices, personalGoals, portfolioUrl, youtubeUrl, facebookUrl,
        pinterestUrl, xUrl, linkedinUrl, googleUrl, socialReviewConsent,
        photoPaths: photos.map((photo) => photo.storage_path),
        whatsappOptIn, telegramChatId, telegramOptIn,
      };
      try {
        const { error } = await (supabase as any).from("model_onboarding_drafts").upsert({
          user_id: user.id, payload, current_step: step, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (!active) return;
        setDraftStatus(error ? "error" : "saved");
        if (error) console.error("Onboarding draft autosave failed:", error);
      } catch (saveFailure) {
        if (!active) return;
        console.error("Onboarding draft autosave failed:", saveFailure);
        setDraftStatus("error");
      }
    }, 700);
    return () => { active = false; window.clearTimeout(timer); };
  }, [user, draftHydrated, submitting, form, step, careerChoices, personalGoals,
      portfolioUrl, youtubeUrl, facebookUrl, pinterestUrl, xUrl, linkedinUrl,
      googleUrl, socialReviewConsent, whatsappOptIn, telegramChatId, telegramOptIn, photos]);

  // If already has model profile, go to dashboard
  useEffect(() => {
    if (!user) return;
    supabase.from("models").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) navigate("/dashboard/model", { replace: true });
    });
  }, [user, navigate]);

  const update = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const addPhotos = async (files: FileList | null) => {
    if (!files || !user) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 8 - photos.length);
    for (const file of list) {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const storage_path = `${user.id}/drafts/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("model-photos").upload(storage_path, file, { upsert: false, contentType: file.type });
      if (error) {
        toast.error(`Could not save ${file.name}. Please retry that photo.`);
        continue;
      }
      const { data: signed } = await supabase.storage.from("model-photos").createSignedUrl(storage_path, 3600);
      if (!signed?.signedUrl) {
        await supabase.storage.from("model-photos").remove([storage_path]);
        toast.error(`Could not preview ${file.name}. Please retry that photo.`);
        continue;
      }
      setPhotos((current) => [...current, { name: file.name, storage_path, preview_url: signed.signedUrl }].slice(0, 8));
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    if (photos.length < 3) {
      toast.error("Please upload at least 3 photos");
      return;
    }
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      // Make submission retry-safe: recover an existing profile if a prior attempt
      // created it but failed while linking photos or completing downstream work.
      const { data: existingModel, error: existingModelError } = await supabase
        .from("models").select("id").eq("user_id", user.id).maybeSingle();
      if (existingModelError) throw existingModelError;

      let modelId = existingModel?.id ?? null;
      if (!modelId) {
        const insertPayload: any = { user_id: user.id, ...parsed.data, tiktok: parsed.data.tiktok || null };
        const { data: createdModel, error: modelErr } = await supabase
          .from("models").insert(insertPayload).select("id").single();
        if (modelErr) throw modelErr;
        modelId = createdModel.id;
      }

      // Photos are durable private objects; link idempotently so a retry cannot
      // duplicate an already-linked photo or fail on the unique model/path key.
      const uploaded = photos.map((photo, position) => ({ storage_path: photo.storage_path, position, model_id: modelId }));
      if (uploaded.length) {
        const { error: photosErr } = await supabase.from("model_photos")
          .upsert(uploaded, { onConflict: "model_id,storage_path", ignoreDuplicates: true });
        if (photosErr) throw photosErr;
      }

      // Trigger AI scoring
      setScoring(true);
      const { error: scoreErr } = await supabase.functions.invoke("score-model", {
        body: { model_id: modelId },
      });
      if (scoreErr) {
        // non-fatal — user can re-trigger from dashboard
        console.error("Scoring failed:", scoreErr);
        toast.warning("Profile saved. ResoFlex™ scoring will be retried — visit your dashboard to re-trigger.");
      } else {
        toast.success("Profile submitted. ResoFlex™ scoring is ready for the Elite NG review team.");
      }
      try {
        const { error: intelligenceError } = await supabase.functions.invoke("chatb2k-talent-intelligence", {
          body: {
            profile_type: "model",
            source_id: modelId,
            profile: {
              display_name: parsed.data.full_name, email: user.email, phone: parsed.data.phone, bio: parsed.data.bio,
              instagram: parsed.data.instagram, tiktok: parsed.data.tiktok,
              career_choices: careerChoices.split(",").map((v) => v.trim()).filter(Boolean),
              goals: personalGoals.split(/\r?\n/).map((v) => v.trim()).filter(Boolean),
              portfolio: { portfolio_url: portfolioUrl || null },
              preferred_language: navigator.language || "en",
              preferred_channels: ["whatsapp", "telegram"],
              whatsapp_opt_in: whatsappOptIn,
              telegram_chat_id: telegramChatId.trim(),
              telegram_opt_in: telegramOptIn,
              social_review_consent: socialReviewConsent,
              social_profiles: [
                { platform: "Instagram", handle: parsed.data.instagram },
                { platform: "TikTok", handle: parsed.data.tiktok },
                { platform: "YouTube", url: youtubeUrl },
                { platform: "Facebook", url: facebookUrl },
                { platform: "Pinterest", url: pinterestUrl },
                { platform: "X", url: xUrl },
                { platform: "LinkedIn", url: linkedinUrl },
                { platform: "Google", url: googleUrl },
                { platform: "Portfolio", url: portfolioUrl },
              ].filter((s) => s.handle || s.url),
            },
          },
        });
        if (intelligenceError) {
          console.error("ChatB2K profile enrichment pending:", intelligenceError);
          toast.warning("Your model profile is saved. ChatB2K enrichment will retry when its service is available.");
        }
  
      } catch (intelligenceFailure) {
        console.error("ChatB2K profile enrichment unavailable:", intelligenceFailure);
        toast.warning("Your model profile is saved. ChatB2K enrichment will retry when its service is available.");
      }
      await (supabase as any).from("model_onboarding_drafts").delete().eq("user_id", user.id);
      navigate("/dashboard/model");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
      setScoring(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl py-12">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Model Application</div>
          <h1 className="font-display text-4xl">Tell us about you</h1>
          <p className="text-xs text-muted-foreground mt-2" aria-live="polite">{draftStatus === "saving" ? "Saving your progress…" : draftStatus === "saved" ? "Your progress is saved securely" : draftStatus === "error" ? "Autosave unavailable — keep this page open and retry" : "Restoring your saved progress…"}</p>
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-12 rounded-full transition ${s <= step ? "bg-gold" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6 md:p-8 space-y-5">
          {step === 1 && (
            <>
              <h2 className="font-display text-2xl">Basics</h2>
              <div>
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={form.age} onChange={(e) => update("age", e.target.value)} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Input value={form.gender} onChange={(e) => update("gender", e.target.value)} placeholder="e.g. Female" />
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+234..." />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="font-display text-2xl">Location</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => update("state", e.target.value)} />
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="font-display text-2xl">Socials & Bio</h2>
              <div>
                <Label>Instagram handle <span className="text-muted-foreground text-xs">(without @)</span></Label>
                <Input value={form.instagram} onChange={(e) => update("instagram", e.target.value.replace(/^@/, ""))} />
              </div>
              <div>
                <Label>TikTok <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={form.tiktok} onChange={(e) => update("tiktok", e.target.value.replace(/^@/, ""))} />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  rows={4}
                  placeholder="Tell us about your style, experience, and what makes you stand out."
                />
                <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/800</p>
              </div>
              <div>
                <Label>Career interests (comma-separated)</Label>
                <Input value={careerChoices} onChange={(e) => setCareerChoices(e.target.value)} placeholder="Modeling, acting, brand campaigns, presenting" />
              </div>
              <div>
                <Label>Personal goals (one per line)</Label>
                <Textarea value={personalGoals} onChange={(e) => setPersonalGoals(e.target.value)} rows={3} placeholder="Build a portfolio, earn from campaigns, develop a personal brand..." />
              </div>
              <div>
                <Label>Portfolio website URL (optional)</Label>
                <Input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>YouTube profile URL</Label><Input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@..." /></div>
                <div><Label>Facebook / Meta profile URL</Label><Input type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." /></div>
                <div><Label>Pinterest profile URL</Label><Input type="url" value={pinterestUrl} onChange={(e) => setPinterestUrl(e.target.value)} placeholder="https://pinterest.com/..." /></div>
                <div><Label>X profile URL</Label><Input type="url" value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="https://x.com/..." /></div>
                <div><Label>LinkedIn profile URL</Label><Input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
                <div><Label>Google / business profile URL</Label><Input type="url" value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} placeholder="https://..." /></div>
              </div>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={socialReviewConsent} onChange={(e) => setSocialReviewConsent(e.target.checked)} className="mt-1" /><span>I consent to ChatB2K reviewing the public profile links I provide to prepare portfolio recommendations. This does not grant account access or prove identity.</span></label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} className="mt-1" /><span>I agree to receive onboarding and portfolio follow-up messages on WhatsApp. I can withdraw consent at any time.</span></label>
              <div>
                <Label>Telegram chat ID (optional)</Label>
                <Input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Add after you have started our Telegram bot" />
              </div>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={telegramOptIn} onChange={(e) => setTelegramOptIn(e.target.checked)} className="mt-1" /><span>I agree to receive onboarding and portfolio follow-up messages from our Telegram bot. I can withdraw consent at any time.</span></label>
            </>
          )}
          {step === 4 && (
            <>
              <h2 className="font-display text-2xl">Photos</h2>
              <p className="text-sm text-muted-foreground">Upload 3–8 high-quality photos. Mix of close-ups and full-body works best.</p>
              <label className="block glass border-2 border-dashed border-gold/30 rounded-2xl p-8 text-center cursor-pointer hover:border-gold transition">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gold" />
                <div className="text-sm">Click to upload</div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
              </label>
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden glass">
                      <img src={p.preview_url} alt={p.name} className="h-full w-full object-cover" />
                      <button
                        onClick={async () => { await supabase.storage.from("model-photos").remove([p.storage_path]); setPhotos((arr) => arr.filter((_, idx) => idx !== i)); }}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{photos.length}/8 photos</p>
            </>
          )}

          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={() => setStep((s) => s + 1)} className="flex-1 bg-gold text-primary-foreground hover:opacity-90">
                Continue
              </Button>
            ) : (
              <Button onClick={onSubmit} disabled={submitting} className="flex-1 bg-gold text-primary-foreground hover:opacity-90 glow-gold">
                {scoring ? (
                  <><Sparkles className="mr-2 h-4 w-4 animate-pulse" /> ResoFlex™ scoring you...</>
                ) : submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  "Submit & get scored"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelOnboarding;
