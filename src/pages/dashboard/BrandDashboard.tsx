import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, Target, Link2, RefreshCw } from "lucide-react";

const BrandDashboard = () => {
  const { user } = useAuth();
  const [brand, setBrand] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bufferConnection, setBufferConnection] = useState<any>(null);
  const [bufferChannels, setBufferChannels] = useState<any[]>([]);
  const [bufferLoading, setBufferLoading] = useState(false);
  const [bufferConnecting, setBufferConnecting] = useState(false);
  const [bufferError, setBufferError] = useState("");

  const loadBuffer = async () => {
    setBufferLoading(true);
    setBufferError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again to manage Buffer.");
      const response = await fetch("/api/auth/buffer/connections", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load Buffer connections.");
      setBufferConnection(payload.connections?.[0] ?? null);
      setBufferChannels(payload.channels ?? []);
    } catch (error) {
      setBufferError(error instanceof Error ? error.message : "Buffer status is unavailable.");
    } finally {
      setBufferLoading(false);
    }
  };

  const connectBuffer = async () => {
    setBufferConnecting(true);
    setBufferError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again before connecting Buffer.");
      const response = await fetch("/api/auth/buffer/connections/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ label: `${brand?.name || "Brand"} social channels` }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.authorizationUrl) throw new Error(payload.error || "Buffer authorization could not start.");
      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setBufferError(error instanceof Error ? error.message : "Buffer connection failed.");
      setBufferConnecting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("buffer_connection");
    if (status === "connected") toast.success("Buffer connected and channels synchronized.");
    else if (status) toast.error(`Buffer connection: ${status.replaceAll("_", " ")}`);
    if (status) window.history.replaceState({}, "", window.location.pathname);
    void loadBuffer();
  }, []);

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

        <section className="glass-strong rounded-3xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl flex items-center gap-2"><Link2 className="h-5 w-5 text-gold" /> ChatB2K Social Publishing</h2>
              <p className="text-sm text-muted-foreground mt-1">Connect your own Buffer account. Your channels and credentials remain isolated to this brand workspace.</p>
            </div>
            <Badge variant="outline" className={bufferConnection?.status === "connected" ? "border-emerald-500/40 text-emerald-400" : "border-border"}>
              {bufferConnection?.status === "connected" ? "Buffer connected" : bufferConnection?.status === "needs_reauth" ? "Reconnect required" : "Not connected"}
            </Badge>
          </div>
          {bufferError && <p role="alert" className="text-sm text-destructive">{bufferError}</p>}
          {bufferLoading ? (
            <p className="text-sm text-muted-foreground">Checking your Buffer connection…</p>
          ) : (
            <>
              {bufferConnection?.account_email && <p className="text-sm"><span className="text-muted-foreground">Account: </span>{bufferConnection.account_email}</p>}
              {bufferChannels.length > 0 && <div className="grid gap-2 sm:grid-cols-2">
                {bufferChannels.map((channel) => (
                  <div key={channel.channel_id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
                    <span className="capitalize">{channel.platform} · {channel.name}</span>
                    <Badge variant="outline">{channel.active ? (channel.publishing_enabled ? "Publishing enabled" : "Connected") : "Unavailable"}</Badge>
                  </div>
                ))}
              </div>}
              <Button onClick={connectBuffer} disabled={bufferConnecting} variant="outline" className="border-gold/40">
                {bufferConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting…</> : <><RefreshCw className="mr-2 h-4 w-4" />{bufferConnection?.status === "connected" ? "Connect another Buffer account" : "Connect / reconnect Buffer"}</>}
              </Button>
            </>
          )}
        </section>

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
