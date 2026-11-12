import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, Plus, RefreshCw, Send, ShieldCheck } from "lucide-react";

type Connection = { id: string; label: string; account_id: string | null; account_email: string | null; account_name: string | null; status: string; last_verified_at: string | null; last_error: string | null; connected_at: string | null };
type Organization = { id: string; connection_id: string; organization_id: string; name: string; active: boolean; last_synced_at: string | null };
type Channel = { id: string; connection_id: string; organization_id: string; channel_id: string; platform: string; name: string; handle: string | null; channel_type: string | null; active: boolean; provider_disconnected: boolean; provider_locked: boolean; is_verified: boolean; publishing_enabled: boolean; last_synced_at: string | null };
type Asset = { id: string; brand: string | null; campaign: string | null; asset_type: string; mime_type: string | null; canonical_url: string | null; qa_status: string; rights_status: string; commercial_status: string; origin_review_status: string; tiktok_eligible: boolean | null; youtube_eligible: boolean | null; google_business_eligible: boolean | null };
type Assignment = { id: string; channel_id: string; client_key: string; host_id: string | null; expected_handle: string; assignment_status: string; verified_at: string | null };
type Authorization = { id: string; asset_registry_id: string; client_key: string; host_id: string | null; channel_id: string; rights_holder: string; authorization_status: string; expires_at: string | null };
type Publication = { id: string; channel_id: string; platform: string; buffer_post_id: string | null; status: string; scheduled_at: string | null; published_at: string | null; error_message: string | null; client_key: string | null; host_id: string | null; target_handle: string | null; created_at: string };
type ClientMapping = { id: string; owner_user_id: string; connection_id: string; organization_id: string; channel_id: string; client_key: string; host_id: string | null; expected_handle: string; owner_evidence: Record<string, any>; created_at: string };\ntype MediaIntake = { id: string; owner_user_id: string; model_id: string; source_url: string; source_host: string; rights_holder: string | null; rights_evidence_url: string | null; status: string; asset_registry_id: string | null; review_note: string | null; created_at: string };\ntype Registry = { connections: Connection[]; organizations: Organization[]; channels: Channel[]; assignments: Assignment[]; authorizations: Authorization[]; publications: Publication[]; assets: Asset[]; media_intake: MediaIntake[]; pending_client_mappings: ClientMapping[] };

const empty: Registry = { connections: [], organizations: [], channels: [], assignments: [], authorizations: [], publications: [], assets: [], media_intake: [], pending_client_mappings: [] };
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString() : "Not yet verified";
const statusTone = (value: string) => value === "connected" || value === "verified" || value === "approved" || value === "scheduled" || value === "sent" ? "default" : "secondary";

export default function EliteMediaCeoDashboard() {
  const { user } = useAuth();
  const [registry, setRegistry] = useState<Registry>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [connectionLabel, setConnectionLabel] = useState("Buffer workspace");
  const [channelId, setChannelId] = useState("");
  const [clientKey, setClientKey] = useState("");
  const [hostId, setHostId] = useState("");
  const [expectedHandle, setExpectedHandle] = useState("");
  const [ownerEvidenceUrl, setOwnerEvidenceUrl] = useState("");
  const [confirmOwner, setConfirmOwner] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [rightsHolder, setRightsHolder] = useState("");
  const [rightsEvidenceUrl, setRightsEvidenceUrl] = useState("");
  const [confirmRights, setConfirmRights] = useState(false);
  const [publishCaption, setPublishCaption] = useState("");
  const [publishAssetId, setPublishAssetId] = useState("");
  const [publishChannelId, setPublishChannelId] = useState("");
  const [publishClientKey, setPublishClientKey] = useState("");

  const api = useCallback(async (path: string, method = "GET", payload?: unknown) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Your Elite administrator session has expired. Sign in again.");
    const response = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "The publishing service could not complete this request.");
    return result;
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api("/api/integrations/buffer/registry");
      setRegistry({
        connections: data.connections || [], organizations: data.organizations || [],
        channels: data.channels || [], assignments: data.assignments || [],
        authorizations: data.authorizations || [], publications: data.publications || [],
        assets: data.assets || [], media_intake: data.media_intake || [], pending_client_mappings: data.pending_client_mappings || [],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load publishing control center.");
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get("buffer_connection");
    if (state === "connected") toast.success("Buffer organization connected and channel discovery completed.");
    if (state && state !== "connected") toast.error(`Buffer connection: ${state.replaceAll("_", " ")}`);
    if (state) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const verifiedChannels = useMemo(() => registry.channels.filter((c) => c.is_verified && c.active && !c.provider_disconnected && !c.provider_locked), [registry.channels]);
  const enabledChannels = useMemo(() => verifiedChannels.filter((c) => c.publishing_enabled), [verifiedChannels]);
  const approvedAssets = useMemo(() => registry.assets.filter((a) => a.qa_status === "approved" && a.rights_status === "verified" && a.commercial_status === "authorized" && a.origin_review_status === "approved"), [registry.assets]);

  const connect = async () => {
    setBusy("connect");
    try {
      const result = await api("/api/auth/buffer/connections/start", "POST", { label: connectionLabel });
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Buffer authorization.");
      setBusy("");
    }
  };

  const sync = async (connectionId: string) => {
    setBusy(connectionId);
    try {
      await api("/api/integrations/buffer/registry", "POST", { action: "sync", connection_id: connectionId });
      toast.success("Organization and channel inventory synchronized.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Channel synchronization failed.");
    } finally { setBusy(""); }
  };

  const assign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!channelId || !clientKey.trim() || !expectedHandle.trim() || !ownerEvidenceUrl.trim()) return;
    setBusy("assign");
    try {
      const result = await api("/api/integrations/buffer/registry", "POST", {
        action: "assign_channel", channel_id: channelId, client_key: clientKey.trim(),
        host_id: hostId.trim() || null, expected_handle: expectedHandle.trim(),
        owner_evidence_url: ownerEvidenceUrl.trim(), confirm_owner: confirmOwner,
      });
      if (result.assignment_status === "verified") {
        await api("/api/integrations/buffer/registry", "POST", { action: "enable_channel", channel_id: channelId, client_key: clientKey.trim() });
        toast.success("Client/host assignment verified and live Buffer queue enabled for this channel.");
      } else {
        toast.success("Assignment saved for verification; live publishing remains disabled for this mapping.");
      }
      setConfirmOwner(false);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Channel assignment failed."); }
    finally { setBusy(""); }
  };

  const authorizeAsset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assetId || !channelId || !clientKey.trim() || !rightsHolder.trim() || !rightsEvidenceUrl.trim() || !confirmRights) return;
    setBusy("rights");
    try {
      await api("/api/integrations/buffer/registry", "POST", {
        action: "authorize_asset", asset_id: assetId, channel_id: channelId,
        client_key: clientKey.trim(), host_id: hostId.trim() || null,
        rights_holder: rightsHolder.trim(), rights_evidence_url: rightsEvidenceUrl.trim(), confirm_rights: true,
      });
      toast.success("Asset rights authorization recorded for the selected client and channel.");
      setConfirmRights(false);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Asset authorization failed."); }
    finally { setBusy(""); }
  };

  const enableChannel = async (targetChannelId: string, targetClientKey: string) => {
    setBusy(`enable:${targetChannelId}`);
    try {
      await api("/api/integrations/buffer/registry", "POST", { action: "enable_channel", channel_id: targetChannelId, client_key: targetClientKey });
      toast.success("Live queue publishing enabled for this verified client/channel pair.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not enable this channel."); }
    finally { setBusy(""); }
  };

  const verifyClientMapping = async (mapping: ClientMapping) => {
    if (!window.confirm(`Verify that host ${mapping.host_id || "(missing)"} is authorized to publish through ${mapping.expected_handle}?`)) return;
    setBusy(`mapping:${mapping.id}`);
    try {
      await api("/api/integrations/buffer/registry", "POST", { action: "verify_client_mapping", assignment_id: mapping.id, owner_user_id: mapping.owner_user_id, client_key: mapping.client_key, confirm_host: true });
      toast.success("Client host-to-channel mapping verified.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Mapping verification failed."); }
    finally { setBusy(""); }
  };

  const completeMediaIntake = async (intake: MediaIntake) => {
    const candidate = window.prompt("Enter the exact asset registry ID after ingestion and QA approval:");
    if (!candidate?.trim()) return;
    setBusy(`intake:${intake.id}`);
    try {
      await api("/api/integrations/buffer/registry", "POST", { action: "complete_media_intake", intake_id: intake.id, asset_id: candidate.trim() });
      toast.success("Client media link matched to the approved asset registry.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Media intake review failed."); }
    finally { setBusy(""); }
  };

  const rejectMediaIntake = async (intake: MediaIntake) => {
    const note = window.prompt("Reason for rejecting this media link:");
    if (!note?.trim()) return;
    setBusy(`intake:${intake.id}`);
    try {
      await api("/api/integrations/buffer/registry", "POST", { action: "reject_media_intake", intake_id: intake.id, review_note: note.trim() });
      toast.success("Media intake rejected.");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Media intake review failed."); }
    finally { setBusy(""); }
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!publishAssetId || !publishChannelId || !publishClientKey.trim() || !publishCaption.trim()) return;
    setBusy("publish");
    try {
      const result = await api("/api/integrations/buffer/publish", "POST", {
        asset_id: publishAssetId, channel_id: publishChannelId,
        client_key: publishClientKey.trim(), caption: publishCaption.trim(),
      });
      toast.success(result.duplicate ? "This asset is already in the channel queue." : `Queued in Buffer · ${result.buffer_post_id}`);
      setPublishCaption("");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Buffer queue submission failed."); }
    finally { setBusy(""); }
  };

  if (loading) return <div className="min-h-screen bg-[#08080b] text-white"><Navbar variant="elite-media" brandTo="/dashboard/elite-media" /><main className="container py-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></main></div>;

  return (
    <div className="min-h-screen bg-[#08080b] text-white">
      <Navbar variant="elite-media" brandTo="/dashboard/elite-media" />
      <main className="container max-w-7xl space-y-7 py-8 md:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/dashboard/elite-media" className="inline-flex items-center gap-2 text-xs text-white/55 hover:text-gold"><ArrowLeft className="h-3.5 w-3.5" /> Elite Media workspace</Link>
            <p className="mt-5 text-xs uppercase tracking-[0.32em] text-gold">Elite Media · CEO control plane</p>
            <h1 className="mt-2 font-display text-3xl md:text-5xl">Publishing Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">Independent Buffer organizations, verified client channels, rights-cleared media and live publishing queues. Each organization and channel retains its own identity, permissions and delivery record.</p>
          </div>
          <Button onClick={() => void load()} variant="outline" className="border-white/15 text-white hover:bg-white/10"><RefreshCw className="mr-2 h-4 w-4" /> Refresh registry</Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Buffer connections", registry.connections.filter((c) => c.status === "connected").length, "Account authorizations"],
            ["Verified channels", verifiedChannels.length, "Provider-confirmed channels"],
            ["Live-enabled channels", enabledChannels.length, "Client/host assignments"],
            ["Rights + QA cleared", approvedAssets.length, "Eligible asset candidates"],
          ].map(([label, value, hint]) => (
            <Card key={String(label)} className="border-white/10 bg-white/[0.035] text-white shadow-xl shadow-black/20">
              <CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-white/45">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-white/40">{hint}</p></CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <Card className="border-gold/20 bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-white">
            <CardHeader><CardTitle className="font-display text-2xl">Connect Buffer workspace</CardTitle><CardDescription className="text-white/50">Authorize each Buffer account independently. One account may expose multiple organizations; each organization is synced separately.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Label className="text-white/70">Workspace label</Label>
              <Input value={connectionLabel} onChange={(e) => setConnectionLabel(e.target.value)} className="border-white/15 bg-black/30 text-white" placeholder="Client / agency Buffer account" />
              <Button onClick={() => void connect()} disabled={busy === "connect"} className="w-full bg-gold text-black hover:bg-gold/90">{busy === "connect" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Connect another Buffer account</Button>
              <p className="text-xs leading-5 text-white/40">Buffer opens its own consent screen. Tokens are stored encrypted on the server; the browser never receives access or refresh tokens.</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader><CardTitle className="font-display text-2xl">Connected organizations</CardTitle><CardDescription className="text-white/50">Each connection has its own organization inventory and refresh-token lifecycle.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {registry.connections.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">No multi-account OAuth connections registered yet. Connect the first account to populate the organization registry.</p> : registry.connections.map((connection) => (
                <div key={connection.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-medium">{connection.label}</p><p className="mt-1 text-xs text-white/45">{connection.account_email || connection.account_name || "Account discovery pending"}</p><p className="mt-1 text-[11px] text-white/35">Verified {dateLabel(connection.last_verified_at)}</p></div>
                    <Badge variant={statusTone(connection.status)}>{connection.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-white/45">{registry.organizations.filter((o) => o.connection_id === connection.id).length} organization(s)</span>
                    <Button size="sm" variant="outline" disabled={busy === connection.id} onClick={() => void sync(connection.id)} className="border-white/15 text-white hover:bg-white/10">{busy === connection.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />} Sync channels</Button>
                  </div>
                  {connection.last_error && <p className="mt-2 text-xs text-red-300">{connection.last_error}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="border-white/10 bg-white/[0.035] text-white">
          <CardHeader><CardTitle className="font-display text-2xl">Organizations and channels</CardTitle><CardDescription className="text-white/50">Channel identity is verified against Buffer. Client/host ownership is a separate explicit assignment.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {registry.organizations.map((org) => (
              <div key={org.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{org.name}</p><p className="text-[11px] text-white/35">Organization ID · {org.organization_id}</p></div><Badge variant="outline" className="border-white/20 text-white/65">{registry.channels.filter((c) => c.organization_id === org.organization_id).length} channels</Badge></div>
                <div className="grid gap-2 md:grid-cols-2">
                  {registry.channels.filter((c) => c.organization_id === org.organization_id).map((channel) => (
                    <div key={channel.channel_id} className="rounded-xl border border-white/10 p-3">
                      <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium">{channel.handle ? `@${channel.handle.replace(/^@/, "")}` : channel.name}</p><p className="mt-1 text-xs text-white/40">{channel.platform} · {channel.channel_id}</p></div><Badge variant={channel.is_verified && channel.active ? "default" : "secondary"}>{channel.provider_disconnected ? "disconnected" : channel.provider_locked ? "locked" : channel.is_verified ? "verified" : "unverified"}</Badge></div>
                      <p className="mt-2 text-xs text-white/40">{registry.assignments.filter((a) => a.channel_id === channel.channel_id).map((a) => `${a.client_key} · ${a.assignment_status}`).join(" | ") || "No client/host assignment"}</p>
                      <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-white/45">{channel.publishing_enabled ? "Live queue enabled" : "Queue disabled"}</span><Button size="sm" variant="outline" disabled={!channel.is_verified || !channel.active || channel.publishing_enabled} onClick={() => { setChannelId(channel.channel_id); setExpectedHandle(channel.handle || channel.name); }} className="border-white/15 text-white hover:bg-white/10">Assign</Button></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {registry.organizations.length === 0 && <p className="text-sm text-white/45">Organization records appear after a Buffer account completes OAuth authorization.</p>}
          </CardContent>
        </Card>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader><CardTitle className="font-display text-xl">Verify client / host ownership</CardTitle><CardDescription className="text-white/50">Create an explicit identity-to-channel mapping. Use an evidence URL controlled by the client or host.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={assign} className="space-y-3">
                <div className="space-y-1"><Label className="text-white/65">Verified Buffer channel</Label><select value={channelId} onChange={(e) => { const c = registry.channels.find((x) => x.channel_id === e.target.value); setChannelId(e.target.value); setExpectedHandle(c?.handle || c?.name || ""); }} className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white"><option value="">Select channel</option>{verifiedChannels.map((c) => <option key={c.channel_id} value={c.channel_id}>{c.platform} · {c.handle || c.name} · {c.channel_id}</option>)}</select></div>
                <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label className="text-white/65">Client identity key</Label><Input value={clientKey} onChange={(e) => setClientKey(e.target.value)} className="border-white/15 bg-black/30 text-white" placeholder="client:brand-or-host" /></div><div className="space-y-1"><Label className="text-white/65">BIGO host ID (optional)</Label><Input value={hostId} onChange={(e) => setHostId(e.target.value)} className="border-white/15 bg-black/30 text-white" placeholder="1125713592" /></div></div>
                <div className="space-y-1"><Label className="text-white/65">Expected channel handle</Label><Input value={expectedHandle} onChange={(e) => setExpectedHandle(e.target.value)} className="border-white/15 bg-black/30 text-white" placeholder="@clienthandle" /></div>
                <div className="space-y-1"><Label className="text-white/65">Ownership / authorization evidence (HTTPS)</Label><Input value={ownerEvidenceUrl} onChange={(e) => setOwnerEvidenceUrl(e.target.value)} className="border-white/15 bg-black/30 text-white" placeholder="https://... client authorization or profile proof" /></div>
                <label className="flex items-start gap-2 text-xs leading-5 text-white/55"><input type="checkbox" checked={confirmOwner} onChange={(e) => setConfirmOwner(e.target.checked)} className="mt-1" /> I have verified that this client/host controls or has authorized this exact social channel and its publishing.</label>
                <Button type="submit" disabled={busy === "assign" || !channelId || !clientKey.trim() || !ownerEvidenceUrl.trim()} className="w-full bg-gold text-black hover:bg-gold/90">{busy === "assign" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Save ownership assignment</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.035] text-white">
            <CardHeader><CardTitle className="font-display text-xl">Authorize a cleared asset</CardTitle><CardDescription className="text-white/50">The asset must already pass the central QA, rights, commercial and origin checks.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={authorizeAsset} className="space-y-3">
                <div className="space-y-1"><Label className="text-white/65">Approved asset</Label><select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white"><option value="">Select QA-cleared asset</option>{approvedAssets.map((a) => <option key={a.id} value={a.id}>{a.brand || a.campaign || a.asset_type} · {a.id.slice(0, 8)}</option>)}</select></div>
                <div className="space-y-1"><Label className="text-white/65">Rights holder</Label><Input value={rightsHolder} onChange={(e) => setRightsHolder(e.target.value)} className="border-white/15 bg-black/30 text-white" placeholder="Verified creator / client / rights holder" /></div>
                <div className="space-y-1"><Label className="text-white/65">Rights evidence (HTTPS)</Label><Input value={rightsEvidenceUrl} onChange={(e) => setRightsEvidenceUrl(e.target.value)} className="border-white/15 bg-black/30 text-white" placeholder="https://... release / license / written authorization" /></div>
                <label className="flex items-start gap-2 text-xs leading-5 text-white/55"><input type="checkbox" checked={confirmRights} onChange={(e) => setConfirmRights(e.target.checked)} className="mt-1" /> I have verified that the named rights holder authorizes this asset for organic publication on the selected channel.</label>
                <Button type="submit" disabled={busy === "rights" || !assetId || !channelId || !clientKey.trim() || !rightsHolder.trim() || !rightsEvidenceUrl.trim() || !confirmRights} className="w-full bg-gold text-black hover:bg-gold/90">{busy === "rights" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Record rights authorization</Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <Card className="border-gold/20 bg-white/[0.035] text-white">
          <CardHeader><CardTitle className="font-display text-2xl">Client host-to-channel mapping approvals</CardTitle><CardDescription className="text-white/50">Client-submitted mappings stay pending until an administrator checks the host evidence and confirms the Buffer channel identity.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {registry.pending_client_mappings.map((mapping) => (
              <div key={mapping.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="min-w-0"><p className="text-sm font-medium">{mapping.expected_handle} · {mapping.channel_id}</p><p className="mt-1 text-xs text-white/40">Host {mapping.host_id || "not supplied"} · client {mapping.client_key.slice(0, 8)} · owner {mapping.owner_user_id.slice(0, 8)}</p><a href={String(mapping.owner_evidence?.host_evidence_url || "")} target="_blank" rel="noreferrer" className="text-xs text-gold underline">Review host identity evidence</a></div>
                <Button size="sm" disabled={busy === `mapping:${mapping.id}`} onClick={() => void verifyClientMapping(mapping)} className="bg-gold text-black hover:bg-gold/90">Verify mapping</Button>
              </div>
            ))}
            {registry.pending_client_mappings.length === 0 && <p className="text-sm text-white/40">No client host mappings are awaiting verification.</p>}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.035] text-white">
          <CardHeader><CardTitle className="font-display text-2xl">Client-submitted media links</CardTitle><CardDescription className="text-white/50">Links remain pending until the source is ingested, registered and passes QA, rights, commercial and origin review. This control only links an exact source URL to an already-cleared registry asset; it does not bypass ingestion or review.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {registry.media_intake.filter((item) => item.status === "pending").map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="min-w-0"><p className="break-all text-sm">{item.source_url}</p><p className="mt-1 text-xs text-white/40">Client {item.owner_user_id.slice(0, 8)} · {item.source_host} · rights holder: {item.rights_holder || "not stated"}</p><a href={item.rights_evidence_url || undefined} target="_blank" rel="noreferrer" className="text-xs text-gold underline">Rights evidence</a></div>
                <div className="flex gap-2"><Button size="sm" disabled={busy === `intake:${item.id}`} onClick={() => void completeMediaIntake(item)} className="bg-gold text-black hover:bg-gold/90">Link approved asset</Button><Button size="sm" variant="outline" disabled={busy === `intake:${item.id}`} onClick={() => void rejectMediaIntake(item)} className="border-white/15 text-white">Reject</Button></div>
              </div>
            ))}
            {!registry.media_intake.some((item) => item.status === "pending") && <p className="text-sm text-white/40">No client media links are awaiting review.</p>}
          </CardContent>
        </Card>

        <Card className="border-gold/20 bg-gradient-to-br from-gold/[0.07] to-white/[0.025] text-white">
          <CardHeader><CardTitle className="font-display text-2xl">Live Buffer queue</CardTitle><CardDescription className="text-white/50">Approved media is sent to the selected channel's next available Buffer slot. The service records the Buffer post ID and scheduled time.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={publish} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr_auto] lg:items-end">
              <div className="space-y-1"><Label className="text-white/65">Approved asset</Label><select value={publishAssetId} onChange={(e) => setPublishAssetId(e.target.value)} className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white"><option value="">Select asset</option>{approvedAssets.map((a) => <option key={a.id} value={a.id}>{a.brand || a.campaign || a.asset_type} · {a.id.slice(0, 8)}</option>)}</select></div>
              <div className="space-y-1"><Label className="text-white/65">Destination channel</Label><select value={publishChannelId} onChange={(e) => setPublishChannelId(e.target.value)} className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white"><option value="">Select enabled channel</option>{enabledChannels.map((c) => <option key={c.channel_id} value={c.channel_id}>{c.platform} · {c.handle || c.name}</option>)}</select></div>
              <div className="space-y-1"><Label className="text-white/65">Client identity key</Label><Input value={publishClientKey} onChange={(e) => setPublishClientKey(e.target.value)} className="border-white/15 bg-black/30 text-white" placeholder="client:..." /></div>
              <div className="space-y-1"><Label className="text-white/65">Caption</Label><Textarea value={publishCaption} onChange={(e) => setPublishCaption(e.target.value)} className="min-h-11 border-white/15 bg-black/30 text-white" rows={2} maxLength={2200} placeholder="Client-specific caption; do not mix identities." /></div>
              <Button type="submit" disabled={busy === "publish" || !publishAssetId || !publishChannelId || !publishClientKey.trim() || !publishCaption.trim()} className="bg-gold text-black hover:bg-gold/90">{busy === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Queue post</Button>
            </form>
            <p className="mt-3 text-xs text-white/40">The dispatcher rejects assets without a verified client/channel assignment, unexpired rights authorization, platform eligibility, stable public media URL and enabled destination.</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.035] text-white">
          <CardHeader><CardTitle className="font-display text-2xl">Publishing ledger</CardTitle><CardDescription className="text-white/50">Per-channel queue records, provider IDs, scheduled times and delivery errors.</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-white/40"><tr><th className="p-2">Client / host</th><th className="p-2">Channel</th><th className="p-2">Status</th><th className="p-2">Buffer post ID</th><th className="p-2">Scheduled</th></tr></thead><tbody>{registry.publications.map((p) => <tr key={p.id} className="border-t border-white/10"><td className="p-2">{p.client_key || "—"}{p.host_id && <span className="block text-xs text-white/40">Host {p.host_id}</span>}</td><td className="p-2">{p.target_handle || p.channel_id}</td><td className="p-2"><Badge variant={statusTone(p.status)}>{p.status}</Badge>{p.error_message && <span className="mt-1 block max-w-xs text-xs text-red-300">{p.error_message}</span>}</td><td className="p-2 font-mono text-xs">{p.buffer_post_id || "—"}</td><td className="p-2 text-xs text-white/55">{dateLabel(p.scheduled_at)}</td></tr>)}</tbody></table>
            {registry.publications.length === 0 && <p className="py-6 text-center text-sm text-white/40">No Buffer publishing jobs recorded yet.</p>}
          </CardContent>
        </Card>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-white/35"><span>Elite101 · Independent publishing service · Supabase-backed audit ledger</span><Link to="/dashboard/admin" className="inline-flex items-center gap-1 hover:text-gold">Admin dashboard <ExternalLink className="h-3 w-3" /></Link></footer>
      </main>
    </div>
  );
}
