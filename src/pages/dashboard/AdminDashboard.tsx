import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, Briefcase, DollarSign, TrendingUp, Star, CheckCircle2, XCircle,
} from "lucide-react";

type Stats = {
  totalModels: number;
  totalBrands: number;
  pendingModels: number;
  activeCampaigns: number;
  totalBookings: number;
  paidBookings: number;
  grossRevenue: number;
  commissionRevenue: number;
};

type ModelRow = {
  id: string;
  full_name: string;
  city: string | null;
  score: number | null;
  category: string | null;
  status: string;
  created_at: string;
};

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  budget_ngn: number;
  slots: number;
  city: string | null;
  created_at: string;
  brands: { name: string } | null;
};

type BookingRow = {
  id: string;
  amount_ngn: number;
  commission_ngn: number;
  status: string;
  created_at: string;
  models: { full_name: string } | null;
  brands: { name: string } | null;
};

type EliteMediaRequestRow = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  intent: string;
  status: string;
  created_at: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  admin_notes: string | null;
  onboarding_completed_at: string | null;
  service_terms_accepted_at: string | null;
  privacy_consent_at: string | null;
  media_rights_confirmed_at: string | null;
  subscription_status: string;
};

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topModels, setTopModels] = useState<ModelRow[]>([]);
  const [pendingModels, setPendingModels] = useState<ModelRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [eliteMediaRequests, setEliteMediaRequests] = useState<EliteMediaRequestRow[]>([]);
  const [bufferConnecting, setBufferConnecting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [
        modelsCount, brandsCount, pendingCount, activeCampCount,
        topRes, pendingRes, campRes, bookRes, eliteMediaRes,
      ] = await Promise.all([
        supabase.from("models").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("id", { count: "exact", head: true }),
        supabase.from("models").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("models").select("id, full_name, city, score, category, status, created_at")
          .not("score", "is", null).order("score", { ascending: false }).limit(10),
        supabase.from("models").select("id, full_name, city, score, category, status, created_at")
          .eq("status", "pending").order("created_at", { ascending: false }).limit(10),
        supabase.from("campaigns")
          .select("id, title, status, budget_ngn, slots, city, created_at, brands(name)")
          .order("created_at", { ascending: false }).limit(10),
        supabase.from("bookings")
          .select("id, amount_ngn, commission_ngn, status, created_at, models(full_name), brands(name)")
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("elite_media_requests")
          .select("id, user_id, email, display_name, intent, status, created_at, trial_starts_at, trial_ends_at, admin_notes, onboarding_completed_at, service_terms_accepted_at, privacy_consent_at, media_rights_confirmed_at, subscription_status")
          .order("created_at", { ascending: false }).limit(100),
      ]);

      const allBookings = (bookRes.data ?? []) as any[];
      const paid = allBookings.filter((b) => b.status === "paid");
      const grossRevenue = paid.reduce((s, b) => s + (b.amount_ngn || 0), 0);
      const commissionRevenue = paid.reduce((s, b) => s + (b.commission_ngn || 0), 0);

      setStats({
        totalModels: modelsCount.count ?? 0,
        totalBrands: brandsCount.count ?? 0,
        pendingModels: pendingCount.count ?? 0,
        activeCampaigns: activeCampCount.count ?? 0,
        totalBookings: allBookings.length,
        paidBookings: paid.length,
        grossRevenue,
        commissionRevenue,
      });
      setTopModels((topRes.data ?? []) as ModelRow[]);
      setPendingModels((pendingRes.data ?? []) as ModelRow[]);
      setCampaigns((campRes.data ?? []) as any);
      setbookingsSafe(allBookings);
      if (eliteMediaRes.error) {
        toast.error("Elite Media requests could not be loaded: " + eliteMediaRes.error.message);
        setEliteMediaRequests([]);
      } else {
        setEliteMediaRequests((eliteMediaRes.data ?? []) as EliteMediaRequestRow[]);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const setbookingsSafe = (rows: any[]) => setBookings(rows as BookingRow[]);

  const updateEliteMediaRequest = async (request: EliteMediaRequestRow, status: "approved" | "rejected" | "in_progress" | "completed" | "cancelled") => {
    if (status === "approved" && (!request.onboarding_completed_at || !request.service_terms_accepted_at || !request.privacy_consent_at || !request.media_rights_confirmed_at)) {
      toast.error("Customer onboarding and all required consent records must be complete before approval.");
      return;
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return toast.error("Could not verify the current admin session.");
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      admin_notes: request.admin_notes ?? null,
    };
    if (status === "approved") {
      patch.approved_by = user.id;
      patch.approved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("elite_media_requests").update(patch).eq("id", request.id);
    if (error) return toast.error("Update failed: " + error.message);
    toast.success("Elite Media request marked " + status.replace("_", " ") + ".");
    await load();
  };

  const activateEliteMediaTrial = async (request: EliteMediaRequestRow) => {
    if (!request.onboarding_completed_at || !request.service_terms_accepted_at || !request.privacy_consent_at || !request.media_rights_confirmed_at) {
      toast.error("Complete the customer brief and all consent records before activating a trial.");
      return;
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return toast.error("Could not verify the current admin session.");
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("elite_media_requests").update({
      status: "in_progress",
      approved_by: user.id,
      approved_at: start.toISOString(),
      trial_starts_at: start.toISOString(),
      trial_ends_at: end.toISOString(),
      subscription_status: "trial",
      updated_at: start.toISOString(),
    }).eq("id", request.id);
    if (error) return toast.error("Trial activation failed: " + error.message);
    toast.success("7-day trial activated. No paid subscription or charge was created.");
    await load();
  };

  const connectBuffer = async () => {
    setBufferConnecting(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) throw new Error("Sign in as an Elite administrator before connecting Buffer.");
      const response = await fetch("/api/auth/buffer/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        credentials: "same-origin",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.authorizationUrl !== "string") {
        throw new Error(result.error || "Buffer OAuth could not be started.");
      }
      window.location.assign(result.authorizationUrl);
    } catch (error: any) {
      toast.error(error?.message || "Buffer connection failed to start.");
      setBufferConnecting(false);
    }
  };

  useEffect(() => {
    void load();
    const url = new URL(window.location.href);
    const status = url.searchParams.get("buffer_oauth");
    if (status) {
      const messages: Record<string, string> = {
        connected: "Buffer OAuth connected and encrypted credentials were persisted.",
        authorization_denied: "Buffer authorization was declined.",
        state_invalid: "Buffer OAuth state validation failed. Restart the connection.",
        code_missing: "Buffer returned without an authorization code.",
        token_exchange_failed: "Buffer token exchange failed; no credentials were saved.",
        token_persistence_failed: "Buffer authorized the app, but secure token persistence failed.",
        configuration_missing: "Buffer OAuth server configuration is incomplete.",
        callback_failed: "Buffer OAuth callback failed; no success was recorded.",
      };
      if (status === "connected") toast.success(messages[status]);
      else toast.error(messages[status] || "Buffer OAuth did not complete.");
      url.searchParams.delete("buffer_oauth");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  const updateModelStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("models").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Model ${status}`);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10 space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-wide">
              Admin <span className="text-gradient-gold">CRM</span>
            </h1>
            <p className="text-muted-foreground mt-1">Platform analytics & operations</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={connectBuffer} disabled={bufferConnecting}>
              {bufferConnecting ? "Connecting…" : "Connect Buffer"}
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI icon={<Users className="h-4 w-4" />} label="Models" value={stats?.totalModels} sub={`${stats?.pendingModels ?? 0} pending`} loading={loading} />
          <KPI icon={<Briefcase className="h-4 w-4" />} label="Brands" value={stats?.totalBrands} loading={loading} />
          <KPI icon={<TrendingUp className="h-4 w-4" />} label="Active campaigns" value={stats?.activeCampaigns} loading={loading} />
          <KPI icon={<Star className="h-4 w-4" />} label="Bookings" value={stats?.totalBookings} sub={`${stats?.paidBookings ?? 0} paid`} loading={loading} />
          <KPI icon={<DollarSign className="h-4 w-4" />} label="Gross revenue" value={stats ? fmtNGN(stats.grossRevenue) : undefined} loading={loading} wide />
          <KPI icon={<DollarSign className="h-4 w-4" />} label="Commission earned" value={stats ? fmtNGN(stats.commissionRevenue) : undefined} loading={loading} wide accent />
        </div>

        <Tabs defaultValue="models" className="w-full">
          <TabsList className="glass">
            <TabsTrigger value="models">Top models</TabsTrigger>
            <TabsTrigger value="pending">Pending approvals</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="elite-media">Elite Media requests</TabsTrigger>
          </TabsList>

          <TabsContent value="models">
            <Card className="glass">
              <CardHeader><CardTitle>Top scoring models</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topModels.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.full_name}</TableCell>
                        <TableCell>{m.city ?? "—"}</TableCell>
                        <TableCell><span className="text-gold font-mono">{m.score}</span></TableCell>
                        <TableCell><Badge variant="outline">{m.category ?? "—"}</Badge></TableCell>
                        <TableCell><StatusBadge status={m.status} /></TableCell>
                        <TableCell>
                          <Link to={`/models/${m.id}`} className="text-sm text-gold hover:underline">View</Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && topModels.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No scored models yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="glass">
              <CardHeader><CardTitle>Pending model approvals</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingModels.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.full_name}</TableCell>
                        <TableCell>{m.city ?? "—"}</TableCell>
                        <TableCell className="text-gold font-mono">{m.score ?? "—"}</TableCell>
                        <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => updateModelStatus(m.id, "approved")}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateModelStatus(m.id, "rejected")}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && pendingModels.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pending models</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card className="glass">
              <CardHeader><CardTitle>Recent campaigns</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Slots</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell>{c.brands?.name ?? "—"}</TableCell>
                        <TableCell>{c.city ?? "—"}</TableCell>
                        <TableCell>{fmtNGN(c.budget_ngn)}</TableCell>
                        <TableCell>{c.slots}</TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                      </TableRow>
                    ))}
                    {!loading && campaigns.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No campaigns yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="elite-media">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Elite Media request queue</CardTitle>
                <p className="text-sm text-muted-foreground">Review creator pilot and offer requests. Approval does not charge the customer or automatically start a trial.</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Customer setup</TableHead>
                      <TableHead>Status / trial</TableHead>
                      <TableHead className="text-right">Review actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eliteMediaRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">{request.intent.replace(/^elite-/, "").replace(/-/g, " ")}</div>
                          <div className="mt-1 font-mono text-[10px] text-muted-foreground">{request.id.slice(0, 8)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{request.display_name || "Creator / brand"}</div>
                          <div className="text-xs text-muted-foreground">{request.email}</div>
                        </TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="text-xs">{request.onboarding_completed_at ? "Brief complete" : "Brief incomplete"}</div>
                          <div className="mt-1 text-[10px] text-muted-foreground">Terms {request.service_terms_accepted_at ? "✓" : "—"} · Privacy {request.privacy_consent_at ? "✓" : "—"} · Rights {request.media_rights_confirmed_at ? "✓" : "—"}</div>
                          {request.trial_ends_at && <div className="mt-1 text-[10px] text-muted-foreground">Ends {new Date(request.trial_ends_at).toLocaleDateString()}</div>}
                        </TableCell>
                        <TableCell><StatusBadge status={request.status} /><div className="mt-1 text-xs text-muted-foreground">{request.subscription_status ?? "not_subscribed"}</div></TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {request.status === "pending_review" && <>
                              <Button size="sm" onClick={() => updateEliteMediaRequest(request, "approved")}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => updateEliteMediaRequest(request, "rejected")}>Reject</Button>
                            </>}
                            {request.status === "approved" && request.intent === "elite-media-free-trial" && <Button size="sm" variant="outline" onClick={() => activateEliteMediaTrial(request)}>Activate 7-day trial</Button>}
                            {request.status === "approved" && request.intent !== "elite-media-free-trial" && <Button size="sm" variant="outline" onClick={() => updateEliteMediaRequest(request, "in_progress")}>Start work</Button>}
                            {request.status === "in_progress" && <Button size="sm" variant="outline" onClick={() => updateEliteMediaRequest(request, "completed")}>Complete</Button>}
                            {["pending_review", "approved", "in_progress"].includes(request.status) && <Button size="sm" variant="ghost" onClick={() => updateEliteMediaRequest(request, "cancelled")}>Cancel</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && eliteMediaRequests.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No Elite Media requests found or the admin role lacks access.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="glass">
              <CardHeader><CardTitle>Recent bookings</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{b.brands?.name ?? "—"}</TableCell>
                        <TableCell>{b.models?.full_name ?? "—"}</TableCell>
                        <TableCell>{fmtNGN(b.amount_ngn)}</TableCell>
                        <TableCell className="text-neon">{fmtNGN(b.commission_ngn)}</TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                      </TableRow>
                    ))}
                    {!loading && bookings.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No bookings yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function KPI({
  icon, label, value, sub, loading, wide, accent,
}: {
  icon: React.ReactNode; label: string; value?: number | string; sub?: string;
  loading?: boolean; wide?: boolean; accent?: boolean;
}) {
  return (
    <Card className={`glass ${wide ? "lg:col-span-2" : ""} ${accent ? "border-neon/40" : ""}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className={`text-3xl font-display ${accent ? "text-neon" : "text-gradient-gold"}`}>
              {value ?? 0}
            </div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-neon/20 text-neon border-neon/40",
    paid: "bg-neon/20 text-neon border-neon/40",
    open: "bg-gold/20 text-gold border-gold/40",
    pending: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/20 text-destructive border-destructive/40",
    cancelled: "bg-destructive/20 text-destructive border-destructive/40",
    closed: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}
