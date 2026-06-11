import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, MapPin } from "lucide-react";

const CampaignMatches = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rematching, setRematching] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    setCampaign(c);
    const { data: m } = await supabase
      .from("matches")
      .select("*")
      .eq("campaign_id", id)
      .order("total_score", { ascending: false });
    const modelIds = (m ?? []).map((r: any) => r.model_id);
    const { data: modelRows } = modelIds.length
      ? await (supabase as any).from("models_public").select("id, full_name, city, category").in("id", modelIds)
      : { data: [] as any[] };
    const { data: photos } = modelIds.length
      ? await supabase.from("model_photos").select("model_id, storage_path, position").in("model_id", modelIds).order("position", { ascending: true })
      : { data: [] as any[] };
    const modelMap = new Map((modelRows ?? []).map((r: any) => [r.id, r]));
    const photoMap = new Map<string, string>();
    (photos ?? []).forEach((p: any) => { if (!photoMap.has(p.model_id)) photoMap.set(p.model_id, p.storage_path); });
    const enriched = await Promise.all(
      (m ?? []).map(async (row: any) => {
        const path = photoMap.get(row.model_id);
        let url = "";
        if (path) {
          const { data } = await supabase.storage.from("model-photos").createSignedUrl(path, 3600);
          url = data?.signedUrl ?? "";
        }
        return { ...row, models: modelMap.get(row.model_id), photoUrl: url };
      })
    );
    setMatches(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const reMatch = async () => {
    if (!id) return;
    setRematching(true);
    const { error } = await supabase.functions.invoke("match-models", { body: { campaign_id: id } });
    if (error) toast.error(error.message);
    else { toast.success("Re-matched!"); await load(); }
    setRematching(false);
  };

  const book = async (modelId: string) => {
    if (!campaign || !user) return;
    setBookingId(modelId);
    try {
      const { data: brand } = await supabase.from("brands").select("id").eq("user_id", user.id).maybeSingle();
      if (!brand) throw new Error("Brand not found");
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: {
          campaign_id: campaign.id,
          model_id: modelId,
          brand_id: brand.id,
          amount_ngn: campaign.budget_ngn,
        },
      });
      if (error) throw error;
      if (data?.authorization_url) window.location.href = data.authorization_url;
      else throw new Error("No checkout URL");
    } catch (e: any) {
      toast.error(e.message || "Booking failed");
    } finally {
      setBookingId(null);
    }
  };

  if (loading) return <div className="min-h-screen"><Navbar /><div className="container py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div></div>;
  if (!campaign) return <div className="min-h-screen"><Navbar /><div className="container py-20 text-center text-muted-foreground">Campaign not found.</div></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/dashboard/brand" className="text-xs text-muted-foreground hover:text-foreground">← Back</Link>
            <h1 className="font-display text-4xl mt-1">{campaign.title}</h1>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{campaign.category}</Badge>
              <Badge variant="outline">{campaign.city}</Badge>
              <Badge variant="outline">₦{campaign.budget_ngn.toLocaleString()}</Badge>
            </div>
          </div>
          <Button onClick={reMatch} disabled={rematching} variant="outline" className="border-gold/40">
            {rematching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Matching...</> : <><Sparkles className="mr-2 h-4 w-4" />Re-run match</>}
          </Button>
        </div>

        {matches.length === 0 ? (
          <div className="glass-strong rounded-3xl p-10 text-center">
            <p className="text-muted-foreground">No matches yet. Try re-running the matcher — you may need approved models in the system first.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((m) => {
              const model = m.models;
              if (!model) return null;
              const bd = m.breakdown || {};
              return (
                <div key={m.id} className="glass-strong rounded-2xl overflow-hidden hover:border-gold transition">
                  <div className="aspect-[4/5] bg-muted relative">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={model.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">No photo</div>
                    )}
                    <div className="absolute top-3 right-3 glass-strong rounded-full px-3 py-1">
                      <span className="font-display text-lg text-gradient-gold">{Math.round(m.total_score)}</span>
                      <span className="text-xs text-muted-foreground"> match</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl">{model.full_name}</h3>
                      {model.category && <Badge variant="outline" className="text-xs">{model.category}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{model.city}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Category fit: <span className="text-foreground">+{bd.category_fit ?? 0}</span></div>
                      <div>Location: <span className="text-foreground">+{bd.location ?? 0}</span></div>
                      <div>ResoFlex™ score: <span className="text-foreground">+{bd.ai_score ?? 0}</span></div>
                    </div>
                    <Button
                      onClick={() => book(model.id)}
                      disabled={bookingId === model.id}
                      className="w-full bg-gold text-primary-foreground hover:opacity-90"
                    >
                      {bookingId === model.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Book — ₦${campaign.budget_ngn.toLocaleString()}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignMatches;
