import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, Target } from "lucide-react";

const BrandDashboard = () => {
  const { user } = useAuth();
  const [brand, setBrand] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: b } = await supabase.from("brands").select("*").eq("user_id", user.id).maybeSingle();
      setBrand(b);
      if (b) {
        const { data: c } = await supabase.from("campaigns").select("*").eq("brand_id", b.id).order("created_at", { ascending: false });
        setCampaigns(c ?? []);
        const { data: bk } = await supabase
          .from("bookings").select("*, campaigns(title), models(full_name)").eq("brand_id", b.id).order("created_at", { ascending: false });
        setBookings(bk ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen"><Navbar /><div className="container py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div></div>;
  }
  if (!brand) {
    return <div className="min-h-screen"><Navbar /><div className="container py-20 text-center">
      <p className="text-muted-foreground">No brand yet.</p>
      <Button asChild className="mt-4 bg-neon text-accent-foreground"><Link to="/onboarding/brand">Create brand</Link></Button>
    </div></div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-neon">Brand Dashboard</div>
            <h1 className="font-display text-4xl mt-1">{brand.name}</h1>
            <p className="text-sm text-muted-foreground">{brand.industry} • {brand.city}</p>
          </div>
          <Button asChild className="bg-gold text-primary-foreground hover:opacity-90 glow-gold">
            <Link to="/campaigns/new"><Plus className="mr-2 h-4 w-4" />New campaign</Link>
          </Button>
        </div>

        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-3 mt-4">
            {campaigns.length === 0 ? (
              <div className="glass-strong rounded-3xl p-10 text-center">
                <Target className="h-10 w-10 text-gold mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No campaigns yet.</p>
                <Button asChild className="bg-gold text-primary-foreground"><Link to="/campaigns/new">Create your first campaign</Link></Button>
              </div>
            ) : (
              campaigns.map((c) => (
                <Link key={c.id} to={`/campaigns/${c.id}/matches`} className="block glass rounded-2xl p-5 hover:border-gold transition">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="font-display text-xl">{c.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{c.brief}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {c.category && <Badge variant="outline">{c.category}</Badge>}
                        {c.city && <Badge variant="outline">{c.city}</Badge>}
                        <Badge variant="outline" className="capitalize">{c.status}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl text-gold">₦{c.budget_ngn.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{c.slots} slot{c.slots > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-2 mt-4">
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No bookings yet.</p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.models?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{b.campaigns?.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg text-gold">₦{b.amount_ngn.toLocaleString()}</div>
                    <Badge variant="outline" className="text-xs capitalize">{b.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BrandDashboard;
