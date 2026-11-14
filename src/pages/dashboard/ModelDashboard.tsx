import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Loader2, MapPin, Instagram, RefreshCw, Link2, CalendarDays } from "lucide-react";

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
  const [modelLoadError, setModelLoadError] = useState("");
  const [rescoring, setRescoring] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bufferLoading, setBufferLoading] = useState(false);
  const [bufferConnecting, setBufferConnecting] = useState(false);
  const [bufferConnection, setBufferConnection] = useState<{ id: string; label: string; account_email: string | null; status: string } | null>(null);
  const [bufferChannels, setBufferChannels] = useState<Array<{ channel_id: string; name: string; platform: string; active: boolean; publishing_enabled: boolean }>>([]);
  const [bufferError, setBufferError] = useState("");
  const [clientWorkspace, setClientWorkspace] = useState<any>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [selectedClientChannel, setSelectedClientChannel] = useState("");
  const [selectedClientAsset, setSelectedClientAsset] = useState("");
  const [clientHostId, setClientHostId] = useState("");
  const [clientHostEvidence, setClientHostEvidence] = useState("");
  const [clientCaption, setClientCaption] = useState("");
  const [clientRightsHolder, setClientRightsHolder] = useState("");
  const [clientRightsEvidence, setClientRightsEvidence] = useState("");
  const [clientMediaLink, setClientMediaLink] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");


  const load = async () => {
    if (!user) {
      setLoading(false);
      setModel(null);
      return;
    }
    setLoading(true);
    setModelLoadError("");
    try {
      const { data: m, error: modelError } = await supabase
        .from("models")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (modelError) {
        console.error("Unable to load model profile", modelError);
        setModelLoadError("We couldn't load your model profile. Your application has not been removed. Please retry.");
        return;
      }

      setModel(m as ModelRow | null);
      if (!m) {
        setPhotos([]);
        setBookings([]);
        return;
      }

      const { data: ph, error: photosError } = await supabase
        .from("model_photos").select("storage_path").eq("model_id", m.id).order("position");
      if (photosError) console.error("Unable to load model photos", photosError);
      const signed = await Promise.all(
        (ph ?? []).map(async (p) => {
          const { data, error } = await supabase.storage.from("model-photos").createSignedUrl(p.storage_path, 3600);
          if (error) console.error("Unable to create model photo URL", error);
          return { url: data?.signedUrl ?? "", path: p.storage_path };
        })
      );
      setPhotos(signed.filter((s) => s.url));

      const { data: bk, error: bookingsError } = await supabase
        .from("bookings").select("*, campaigns(title), brands(name)").eq("model_id", m.id).order("created_at", { ascending: false });
      if (bookingsError) console.error("Unable to load model bookings", bookingsError);
      setBookings(bk ?? []);
    } catch (error) {
      console.error("Unexpected model dashboard profile load failure", error);
      setModelLoadError("We couldn't load your model profile. Your application has not been removed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const loadBuffer = async () => {
    if (!user) return;
    setBufferLoading(true);
    setBufferError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again to manage Buffer.");
      const response = await fetch("/api/auth/buffer/connections", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load your Buffer connection.");
      setBufferConnection(payload.connections?.[0] ?? null);
      setBufferChannels(payload.channels ?? []);
    } catch (error) {
      setBufferError(error instanceof Error ? error.message : "Buffer status is unavailable.");
    } finally {
      setBufferLoading(false);
    }
  };

  useEffect(() => { void loadBuffer(); /* eslint-disable-next-line */ }, [user]);

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
        body: JSON.stringify({ label: `${model?.full_name || "Model"} social channels` }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.authorizationUrl) throw new Error(payload.error || "Buffer authorization could not start.");
      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setBufferError(error instanceof Error ? error.message : "Buffer connection failed.");
      setBufferConnecting(false);
    }
  };

  const clientWorkspaceRequest = async (method = "GET", body?: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sign in again to manage ChatB2K publishing.");
    const response = await fetch("/api/integrations/buffer/client-workspace", {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(method === "POST" ? { body: JSON.stringify(body || {}) } : {}), cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Client publishing workspace request failed.");
    return payload;
  };

  const loadClientWorkspace = async () => {
    if (!user) return;
    setWorkspaceLoading(true);
    setWorkspaceError("");
    try {
      const payload = await clientWorkspaceRequest();
      setClientWorkspace(payload);
      if (!selectedClientChannel && payload.channels?.length) setSelectedClientChannel(payload.channels[0].channel_id);
      if (!selectedClientAsset && payload.assets?.length) setSelectedClientAsset(payload.assets[0].id);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Could not load publishing workspace.");
    } finally { setWorkspaceLoading(false); }
  };

  useEffect(() => { void loadClientWorkspace(); /* eslint-disable-next-line */ }, [user]);

  const runClientWorkspaceAction = async (body: Record<string, unknown>) => {
    setWorkspaceBusy(true);
    setWorkspaceError("");
    try {
      await clientWorkspaceRequest("POST", body);
      toast.success("ChatB2K publishing workspace updated.");
      await loadClientWorkspace();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publishing workspace action failed.";
      setWorkspaceError(message);
      toast.error(message);
    } finally { setWorkspaceBusy(false); }
  };

  const queueClientPost = async () => {
    setWorkspaceBusy(true);
    setWorkspaceError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again before publishing.");
      const response = await fetch("/api/integrations/buffer/client-publish", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: selectedClientAsset, channel_id: selectedClientChannel, caption: clientCaption, confirm_publish: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not add this post to Buffer.");
      toast.success("Approved post added to your Buffer queue.");
      setClientCaption("");
      await loadClientWorkspace();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Buffer queue request failed.";
      setWorkspaceError(message);
      toast.error(message);
    } finally { setWorkspaceBusy(false); }
  };

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

  if (modelLoadError) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center space-y-4">
          <p role="alert" className="text-muted-foreground">{modelLoadError}</p>
          <Button onClick={() => void load()} className="bg-gold text-primary-foreground">
            <RefreshCw className="mr-2 h-4 w-4" />Retry profile load
          </Button>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">No model profile was found for this signed-in account.</p>
          <p className="text-sm text-muted-foreground mt-2">If you already submitted an application, sign in with the same email used during submission or contact the Elite NG team. Do not submit a duplicate application.</p>
          <Button asChild className="mt-4 bg-gold text-primary-foreground"><a href="/onboarding/model">Start onboarding</a></Button>
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

        <section className="glass-strong rounded-3xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl flex items-center gap-2"><Link2 className="h-5 w-5 text-gold" /> ChatB2K Social Publishing</h2>
              <p className="text-sm text-muted-foreground mt-1">Connect your own Buffer account. Your credentials remain isolated from other clients.</p>
            </div>
            {bufferConnection?.status === "connected" ? <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">Buffer connected</Badge> : bufferConnection?.status === "refresh_pending" ? <Badge variant="outline">Refreshing connection</Badge> : <Badge variant="outline">Reconnect required</Badge>}
          </div>
          {bufferError && <p role="alert" className="text-sm text-destructive">{bufferError}</p>}
          {bufferLoading ? <p className="text-sm text-muted-foreground">Checking your Buffer connection…</p> : bufferConnection ? (
            <div className="space-y-3">
              <div className="text-sm"><span className="text-muted-foreground">Account: </span>{bufferConnection.account_email || bufferConnection.label}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {bufferChannels.map((channel) => (
                  <div key={channel.channel_id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
                    <div><div className="font-medium">{channel.name}</div><div className="text-xs text-muted-foreground capitalize">{channel.platform}</div></div>
                    <Badge variant="outline" className={channel.active ? "border-emerald-500/40 text-emerald-400" : ""}>{channel.active ? "Available" : "Inactive"}</Badge>
                  </div>
                ))}
              </div>
              <Button onClick={connectBuffer} disabled={bufferConnecting} variant="outline" className="border-gold/40">{bufferConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Reconnect / refresh Buffer</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Connect the Buffer account that owns the social channels you want ChatB2K to prepare content for.</p>
              <Button onClick={connectBuffer} disabled={bufferConnecting} className="bg-gold text-primary-foreground">{bufferConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}Connect my Buffer</Button>
            </div>
          )}
          <div className="rounded-xl border border-border/60 p-4 space-y-2">
            <div className="flex items-center gap-2 font-medium"><CalendarDays className="h-4 w-4 text-gold" /> Publishing permissions</div>
            <p className="text-xs text-muted-foreground">Connecting Buffer imports the channels but does not publish automatically. Publishing remains disabled until you approve the content and a schedule is configured in the ChatB2K publishing workspace.</p>
          </div>
        </section>

        <section className="glass-strong rounded-3xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-display text-xl">Client-owned ChatB2K autopublishing</h2>
              <p className="text-sm text-muted-foreground mt-1">Map your Buffer organization to your Highlights host, authorize cleared media, approve a caption and add it to your Buffer queue.</p></div>
            <Button variant="outline" onClick={() => void loadClientWorkspace()} disabled={workspaceLoading}>{workspaceLoading ? "Refreshing…" : "Refresh workspace"}</Button>
          </div>
          {workspaceError && <p role="alert" className="text-sm text-destructive">{workspaceError}</p>}
          {workspaceLoading ? <p className="text-sm text-muted-foreground">Loading your organizations, channels and eligible captures…</p> : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm space-y-1">Your Buffer channel
                  <select className="w-full rounded-xl border border-border bg-background p-3" value={selectedClientChannel} onChange={(e) => setSelectedClientChannel(e.target.value)}>
                    <option value="">Select a channel</option>
                    {(clientWorkspace?.channels || []).map((channel: any) => <option key={channel.channel_id} value={channel.channel_id}>{channel.name} · {channel.platform} · {(clientWorkspace?.organizations || []).find((org: any) => org.organization_id === channel.organization_id)?.name || channel.organization_id}</option>)}
                  </select>
                </label>
                <label className="text-sm space-y-1">BIGO / Highlights host ID
                  <input className="w-full rounded-xl border border-border bg-background p-3" value={clientHostId} onChange={(e) => setClientHostId(e.target.value)} placeholder="Exact verified host ID" />
                </label>
              </div>
              <label className="block text-sm space-y-1">Host ownership / identity evidence URL
                <input type="url" className="w-full rounded-xl border border-border bg-background p-3" value={clientHostEvidence} onChange={(e) => setClientHostEvidence(e.target.value)} placeholder="https://public-host-profile-or-authorization…" />
              </label>
              <Button disabled={workspaceBusy || !selectedClientChannel || !clientHostId.trim() || !clientHostEvidence.startsWith("https://")} variant="outline" onClick={() => void runClientWorkspaceAction({ action: "map_channel", channel_id: selectedClientChannel, host_id: clientHostId.trim(), host_evidence_url: clientHostEvidence })}>Submit channel-to-host mapping for verification</Button>
              <div className="text-xs text-muted-foreground">{(clientWorkspace?.assignments || []).length} channel mapping(s) · {(clientWorkspace?.highlights || []).length} matching Highlights capture(s)</div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm space-y-1">Eligible Highlights asset
                  <select className="w-full rounded-xl border border-border bg-background p-3" value={selectedClientAsset} onChange={(e) => setSelectedClientAsset(e.target.value)}>
                    <option value="">Select a cleared asset</option>
                    {(clientWorkspace?.assets || []).filter((asset: any) => asset.qa_status === "approved" && asset.rights_status === "verified" && asset.commercial_status === "authorized" && asset.origin_review_status === "approved").map((asset: any) => <option key={asset.id} value={asset.id}>{asset.asset_type} · {asset.id.slice(0, 8)}</option>)}
                  </select>
                </label>
                <label className="text-sm space-y-1">Rights holder
                  <input className="w-full rounded-xl border border-border bg-background p-3" value={clientRightsHolder} onChange={(e) => setClientRightsHolder(e.target.value)} placeholder="Person or entity holding publishing rights" />
                </label>
              </div>
              <label className="block text-sm space-y-1">Rights evidence URL
                <input type="url" className="w-full rounded-xl border border-border bg-background p-3" value={clientRightsEvidence} onChange={(e) => setClientRightsEvidence(e.target.value)} placeholder="https://… ownership / licence evidence" />
              </label>
              <Button disabled={workspaceBusy || !selectedClientAsset || !selectedClientChannel || !clientRightsHolder.trim() || !clientRightsEvidence.startsWith("https://")} variant="outline" onClick={() => void runClientWorkspaceAction({ action: "authorize_asset", asset_id: selectedClientAsset, channel_id: selectedClientChannel, rights_holder: clientRightsHolder.trim(), rights_evidence_url: clientRightsEvidence, confirm_rights: true })}>Confirm rights and enable channel</Button>
              <label className="block text-sm space-y-1">Caption / post copy
                <textarea className="w-full min-h-24 rounded-xl border border-border bg-background p-3" maxLength={2200} value={clientCaption} onChange={(e) => setClientCaption(e.target.value)} placeholder="Write or paste your approved ChatB2K caption…" />
              </label>
              <Button disabled={workspaceBusy || !selectedClientAsset || !selectedClientChannel || !clientCaption.trim()} onClick={() => void queueClientPost()} className="bg-gold text-primary-foreground">Approve and add to Buffer queue</Button>
              <div className="border-t border-border/60 pt-4 space-y-2">
                <h3 className="font-medium">Supply another media link</h3>
                <p className="text-xs text-muted-foreground">External links enter review and ingestion first. They cannot bypass asset QA, ownership or platform clearance.</p>
                <input type="url" className="w-full rounded-xl border border-border bg-background p-3" value={clientMediaLink} onChange={(e) => setClientMediaLink(e.target.value)} placeholder="https://public-media-link…" />
                <Button disabled={workspaceBusy || !clientMediaLink.startsWith("https://") || !clientRightsHolder.trim() || !clientRightsEvidence.startsWith("https://")} variant="outline" onClick={async () => { await runClientWorkspaceAction({ action: "submit_media_link", media_url: clientMediaLink, rights_holder: clientRightsHolder.trim(), rights_evidence_url: clientRightsEvidence, confirm_rights: true }); setClientMediaLink(""); }}>Submit media link for ingestion review</Button>
                {(clientWorkspace?.media_intake || []).map((item: any) => <div key={item.id} className="text-xs text-muted-foreground flex justify-between gap-3"><span className="truncate">{item.source_url}</span><Badge variant="outline">{item.status}</Badge></div>)}
              </div>
            </>
          )}
        </section>

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
