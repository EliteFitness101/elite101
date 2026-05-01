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
  const [photos, setPhotos] = useState<File[]>([]);

  // If already has model profile, go to dashboard
  useEffect(() => {
    if (!user) return;
    supabase.from("models").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) navigate("/dashboard/model", { replace: true });
    });
  }, [user, navigate]);

  const update = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 8 - photos.length);
    setPhotos((p) => [...p, ...list].slice(0, 8));
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
      // Insert model row
      const { data: model, error: modelErr } = await supabase
        .from("models")
        .insert({ user_id: user.id, ...parsed.data, tiktok: parsed.data.tiktok || null })
        .select()
        .single();
      if (modelErr) throw modelErr;

      // Upload photos
      const uploaded: { storage_path: string; position: number }[] = [];
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${model.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("model-photos").upload(path, file);
        if (upErr) throw upErr;
        uploaded.push({ storage_path: path, position: i });
      }
      if (uploaded.length) {
        const { error: photosErr } = await supabase
          .from("model_photos")
          .insert(uploaded.map((p) => ({ ...p, model_id: model.id })));
        if (photosErr) throw photosErr;
      }

      // Trigger AI scoring
      setScoring(true);
      const { error: scoreErr } = await supabase.functions.invoke("score-model", {
        body: { model_id: model.id },
      });
      if (scoreErr) {
        // non-fatal — user can re-trigger from dashboard
        console.error("Scoring failed:", scoreErr);
        toast.warning("Profile saved. AI scoring will be retried — visit your dashboard to re-trigger.");
      } else {
        toast.success("Profile created and scored!");
      }
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
                      <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}
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
                  <><Sparkles className="mr-2 h-4 w-4 animate-pulse" /> AI scoring you...</>
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
