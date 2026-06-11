import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Loader2, MapPin, Instagram, RefreshCw } from "lucide-react";

interface ModelRow {
  id: string;
  full_name: string;
  city: string | null;
  state: string | null;
  instagram: string | null;
  bio: string | null;
  score: number | null;
  category: string | null;
  status: string;
  ai_reasoning: string | null;
  ai_strengths: string[] | null;
  ai_improvements: string[] | null;
  scored_at: string | null;
}

const categoryColor: Record<string, string> = {
  Platinum: "text-gold border-gold/40",
  Commercial: "text-neon border-neon/40",
  Influencer: "text-gold border-gold/40",
  Training: "text-muted-foreground border-border",
};

const ModelDashboard = () => {
  const { user } = useAuth();
  const [model, setModel] = useState<ModelRow | null>(null);
  const [photos, setPhotos] = useState<{ url: string; path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: m } = await supabase.from("models").select("*").eq("user_id", user.id).maybeSingle();
    setModel(m as ModelRow | null);
    if (m) {
      const { data: ph } = await supabase
        .from("model_photos").select("storage_path").eq("model_id", m.id).order("position");
      const signed = await Promise.all(
        (ph ?? []).map(async (p) => {
          const { data } = await supabase.storage.from("model-photos").createSignedUrl(p.storage_path, 3600);
          return { url: data?.signedUrl ?? "", path: p.storage_path };
        })
      );
      setPhotos(signed.filter((s) => s.url));
      const { data: bk } = await supabase
        .from("bookings").select("*, campaigns(title), brands(name)").eq("model_id", m.id).order("created_at", { ascending: false });
      setBookings(bk ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const reScore = async () => {
    if (!model) return;
    setRescoring(true);
    const { error } = await supabase.functions.invoke("score-model", { body: { model_id: model.id } });
    if (error) toast.error(error.message);
    else { toast.success("Re-scored!"); await load(); }
    setRescoring(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">No model profile yet.</p>
          <Button asChild className="mt-4 bg-gold text-primary-foreground"><a href="/onboarding/model">Complete onboarding</a></Button>
        </div>
      </div>
    );
  }

  const score = model.score ?? 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold">Model Dashboard</div>
            <h1 className="font-display text-4xl mt-1">{model.full_name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              {model.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{model.city}</span>}
              {model.instagram && <span className="flex items-center gap-1"><Instagram className="h-3 w-3" />@{model.instagram}</span>}
            </div>
          </div>
          <Button onClick={reScore} disabled={rescoring} variant="outline" className="border-gold/40">
            {rescoring ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scoring...</> : <><RefreshCw className="mr-2 h-4 w-4" />Re-run ResoFlex™ score</>}
          </Button>
        </div>

        {/* Score card */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass-strong rounded-3xl p-8 text-center md:col-span-1">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">ResoFlex™ Score</div>
            <div className="relative inline-flex items-center justify-center my-4">
              <svg className="h-40 w-40 -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                <circle
                  cx="80" cy="80" r="70" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
                  strokeDasharray={`${(score / 100) * 440} 440`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display text-5xl text-gradient-gold">{score || "—"}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">/ 100</div>
              </div>
            </div>
            {model.category && (
              <Badge variant="outline" className={`${categoryColor[model.category]} mt-2`}>
                {model.category}
              </Badge>
            )}
            <div className="text-xs text-muted-foreground mt-3 capitalize">Status: {model.status}</div>
          </div>

          <div className="glass-strong rounded-3xl p-6 md:col-span-2 space-y-4">
            <h3 className="font-display text-xl flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold" />ResoFlex™ insights</h3>
            {model.ai_reasoning ? (
              <>
                <p className="text-sm text-muted-foreground">{model.ai_reasoning}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {model.ai_strengths?.length ? (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-neon mb-2">Strengths</div>
                      <ul className="text-sm space-y-1">
                        {model.ai_strengths.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {model.ai_improvements?.length ? (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gold mb-2">Improve</div>
                      <ul className="text-sm space-y-1">
                        {model.ai_improvements.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No ResoFlex™ analysis yet. Click "Re-run ResoFlex™ score" to generate.</p>
            )}
          </div>
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="glass-strong rounded-3xl p-6">
            <h3 className="font-display text-xl mb-4">Portfolio</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {photos.map((p) => (
                <img key={p.path} src={p.url} alt="" className="aspect-square rounded-lg object-cover w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Bookings */}
        <div className="glass-strong rounded-3xl p-6">
          <h3 className="font-display text-xl mb-4">Bookings</h3>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between glass rounded-xl p-4">
                  <div>
                    <div className="font-medium">{b.campaigns?.title}</div>
                    <div className="text-xs text-muted-foreground">{b.brands?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg text-gold">₦{b.amount_ngn.toLocaleString()}</div>
                    <Badge variant="outline" className="text-xs capitalize">{b.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelDashboard;
