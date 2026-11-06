import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, MapPin, Sparkles } from "lucide-react";

const Marketplace = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("models_public")
        .select("id, full_name, city, score, category")
        .order("score", { ascending: false, nullsFirst: false });
      const ids = (data ?? []).map((m: any) => m.id);
      const { data: photos } = ids.length
        ? await supabase.from("model_photos").select("model_id, storage_path, position").in("model_id", ids).order("position", { ascending: true })
        : { data: [] as any[] };
      const photoByModel = new Map<string, string>();
      (photos ?? []).forEach((p: any) => { if (!photoByModel.has(p.model_id)) photoByModel.set(p.model_id, p.storage_path); });
      const enriched = await Promise.all(
        (data ?? []).map(async (m: any) => {
          const path = photoByModel.get(m.id);
          let url = "";
          if (path) {
            const { data: s } = await supabase.storage.from("model-photos").createSignedUrl(path, 3600);
            url = s?.signedUrl ?? "";
          }
          return { ...m, photoUrl: url };
        })
      );
      setModels(enriched);
      setLoading(false);
    })();
  }, []);

  const filtered = models.filter((m) => {
    if (cat !== "all" && m.category !== cat) return false;
    if (q && !`${m.full_name} ${m.city}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-gradient-to-br from-white/[0.07] via-black to-amber-950/20 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold"><Sparkles className="h-3.5 w-3.5" /> Elite talent marketplace</div>
              <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Discover talent.<br /><span className="text-gradient-gold">Find the right fit.</span></h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Explore approved public profiles, review their portfolios and connect with talent for your next campaign or collaboration.</p>
            </div>
            <div className="rounded-2xl border border-gold/20 bg-black/40 px-5 py-4 backdrop-blur-xl">
              <div className="text-3xl font-display text-gradient-gold tabular-nums">{loading ? "—" : filtered.length}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Profiles in view</div>
            </div>
          </div>
        </section>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:flex-row sm:items-center">
          <Input placeholder="Search by name or city" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs rounded-full" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="max-w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {["Platinum", "Commercial", "Influencer", "Training"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <section aria-label="How talent discovery works" className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-3">
          {[
            { step: "01", title: "Discover", detail: "Browse approved public talent profiles." },
            { step: "02", title: "Review", detail: "Open a profile to explore its details." },
            { step: "03", title: "Connect", detail: "Choose the next step for your brief." },
          ].map((item, index) => (
            <div key={item.step} className="flex items-start gap-3 rounded-xl px-2 py-2">
              <span className="font-display text-2xl text-gradient-gold">{item.step}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{item.title}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              </div>
              {index < 2 && <ArrowRight className="ml-auto mt-1 hidden h-4 w-4 shrink-0 text-gold/60 sm:block" />}
            </div>
          ))}
        </section>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass-strong rounded-3xl p-10 text-center">
            <p className="text-muted-foreground">No approved models yet. Be the first — apply now.</p>
          </div>
        ) : (
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(200,169,106,.45)_transparent]" role="region" aria-label="Approved talent profiles" tabIndex={0}>
            {filtered.map((m) => (
              <Link key={m.id} to={`/models/${m.id}`} className="glass-strong group w-[72vw] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 transition hover:-translate-y-1 hover:border-gold/60 sm:w-[280px]">
                <div className="aspect-[4/5] bg-muted relative">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.full_name} className="h-full w-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No photo</div>
                  )}
                  {m.score != null && (
                    <div className="absolute top-2 right-2 glass-strong rounded-full px-2.5 py-0.5">
                      <span className="font-display text-sm text-gradient-gold">{m.score}</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-medium truncate">{m.full_name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{m.city}
                    </span>
                    {m.category && <Badge variant="outline" className="text-[10px]">{m.category}</Badge>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
