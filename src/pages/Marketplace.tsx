import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";

const Marketplace = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("models_public")
        .select("id, full_name, city, score, category, model_photos:model_photos!model_photos_model_id_fkey(storage_path)")
        .order("score", { ascending: false, nullsFirst: false });
      const enriched = await Promise.all(
        (data ?? []).map(async (m: any) => {
          const path = m.model_photos?.[0]?.storage_path;
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
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-gold">Marketplace</div>
          <h1 className="font-display text-4xl mt-1">Discover talent</h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="Search by name or city" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="max-w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {["Platinum", "Commercial", "Influencer", "Training"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass-strong rounded-3xl p-10 text-center">
            <p className="text-muted-foreground">No approved models yet. Be the first — apply now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((m) => (
              <Link key={m.id} to={`/models/${m.id}`} className="glass-strong rounded-2xl overflow-hidden hover:border-gold transition group">
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
