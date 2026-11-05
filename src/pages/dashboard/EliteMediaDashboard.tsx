import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import EliteMediaShowcaseVideo from "@/components/EliteMediaShowcaseVideo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, FileVideo, CalendarClock, ArrowRight, Film, RefreshCw } from "lucide-react";

type RequestRow = {
  id: string; intent: string; status: string; created_at: string; updated_at: string;
  trial_starts_at: string | null; trial_ends_at: string | null; admin_notes: string | null;
  business_name: string | null; phone: string | null; country: string | null; timezone: string | null;
  website_url: string | null; creator_handle: string | null; target_platforms: string[] | null;
  goals: string | null; content_source_url: string | null; preferred_contact: string | null;
  service_terms_accepted_at: string | null; privacy_consent_at: string | null; media_rights_confirmed_at: string | null;
  onboarding_completed_at: string | null; subscription_status: string; subscription_plan: string | null; billing_reference: string | null;
};

type RenderJobRow = {
  id: string;
  request_id: string | null;
  status: string;
  input: { topic?: string } | null;
  output_url: string | null;
  created_at: string;
};

const offers = [
  { value: "elite-media-free-trial", label: "Free 7-day Elite Media pilot" },
  { value: "elite-highlight-launch-pack", label: "Highlight Launch Pack" },
  { value: "elite-creator-starter", label: "Creator Starter" },
  { value: "elite-creator-pro", label: "Creator Pro" },
  { value: "elite-agency-workspace", label: "Agency Workspace" },
  { value: "elite-agency-production-retainer", label: "Agency Production" },
];
const platforms = ["TikTok", "Instagram", "YouTube", "Facebook", "Google Business Profile", "BIGO Live", "Other"];
const statusLabel = (value: string) => value.replaceAll("_", " ");
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString() : "Not scheduled";

export default function EliteMediaDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newIntent, setNewIntent] = useState("elite-media-free-trial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [contentSourceUrl, setContentSourceUrl] = useState("");
  const [preferredContact, setPreferredContact] = useState("Email");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [confirmRights, setConfirmRights] = useState(false);
  const [renderJobs, setRenderJobs] = useState<RenderJobRow[]>([]);
  const [renderTopic, setRenderTopic] = useState("");
  const [rendering, setRendering] = useState(false);
  const [pollingJobId, setPollingJobId] = useState("");
  const [flowFile, setFlowFile] = useState<File | null>(null);
  const [flowResolution, setFlowResolution] = useState<"320p" | "720p">("320p");
  const [flowPrompts, setFlowPrompts] = useState<{ role: string; duration_seconds: number; aspect_ratio: string; prompt: string }[]>([]);

  const selected = useMemo(() => requests.find((r) => r.id === selectedId) ?? null, [requests, selectedId]);
  const renderEntitled = Boolean(selected && ["approved", "in_progress"].includes(selected.status) && (
    (selected.subscription_status === "trial" && selected.trial_starts_at && selected.trial_ends_at &&
      new Date(selected.trial_starts_at).getTime() <= Date.now() && new Date(selected.trial_ends_at).getTime() > Date.now()) ||
    ["active", "paid", "subscribed"].includes(String(selected.subscription_status || "").toLowerCase())
  ));

  const applyRow = useCallback((row: RequestRow | null) => {
    setBusinessName(row?.business_name ?? "");
    setPhone(row?.phone ?? "");
    setCountry(row?.country ?? "Nigeria");
    setTimezone(row?.timezone ?? "Africa/Lagos");
    setWebsiteUrl(row?.website_url ?? "");
    setCreatorHandle(row?.creator_handle ?? "");
    setSelectedPlatforms(row?.target_platforms ?? []);
    setGoals(row?.goals ?? "");
    setContentSourceUrl(row?.content_source_url ?? "");
    setPreferredContact(row?.preferred_contact ?? "Email");
    setAcceptTerms(Boolean(row?.service_terms_accepted_at));
    setAcceptPrivacy(Boolean(row?.privacy_consent_at));
    setConfirmRights(Boolean(row?.media_rights_confirmed_at));
    if (row) setNewIntent(row.intent);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("elite-media-workspace", { method: "GET" });
    if (error || !data?.ok) {
      toast.error("Could not load your Elite Media workspace. Please refresh and sign in again.");
      setRequests([]);
      setLoading(false);
      return;
    }
    const rows = (data.requests ?? []) as RequestRow[];
    setRequests(rows);
    const { data: jobRows, error: jobsError } = await supabase.from("elite_media_generation_jobs")
      .select("id,request_id,status,input,output_url,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    if (!jobsError) setRenderJobs((jobRows ?? []) as RenderJobRow[]);
    const nextId = rows.some((r) => r.id === selectedId) ? selectedId : (rows[0]?.id ?? "");
    setSelectedId(nextId);
    applyRow(rows.find((r) => r.id === nextId) ?? null);
    setLoading(false);
  }, [user, selectedId, applyRow]);

  useEffect(() => { void load(); }, [load]);

  const chooseRequest = (id: string) => {
    setSelectedId(id);
    applyRow(requests.find((r) => r.id === id) ?? null);
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((current) => current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !country.trim() || !goals.trim() || selectedPlatforms.length === 0) {
      toast.error("Complete business/creator name, country, goals, and at least one platform.");
      return;
    }
    if (!acceptTerms || !acceptPrivacy || !confirmRights) {
      toast.error("Please review and confirm all three required consent statements.");
      return;
    }
    setSaving(true);
    const payload = {
      ...(selected ? { request_id: selected.id } : { intent: newIntent }),
      business_name: businessName,
      phone,
      country,
      timezone,
      website_url: websiteUrl,
      creator_handle: creatorHandle,
      target_platforms: selectedPlatforms,
      goals,
      content_source_url: contentSourceUrl,
      preferred_contact: preferredContact,
      service_terms_accepted: acceptTerms,
      privacy_consent: acceptPrivacy,
      media_rights_confirmed: confirmRights,
    };
    const { data, error } = await supabase.functions.invoke("elite-media-workspace", { body: payload });
    if (error || !data?.ok) {
      const code = data?.error;
      const messages: Record<string, string> = {
        website_must_use_https: "Website link must begin with https://.",
        media_link_must_use_https: "Media link must begin with https://.",
        request_not_found: "That request could not be found. Refresh the workspace and retry.",
      };
      toast.error(messages[code] ?? "Your details were not saved. Check the fields and retry.");
      setSaving(false);
      return;
    }
    toast.success("Workspace details and consent records saved.");
    setSaving(false);
    await load();
  };

  const startRender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !renderEntitled || !renderTopic.trim()) return;
    setRendering(true);
    const { data, error } = await supabase.functions.invoke("elite-media-generator", {
      body: { action: "generate_prompts", topic: renderTopic.trim() },
    });
    if (error || !data?.ok) {
      toast.error(data?.error ?? error?.message ?? "The Flow prompt pack could not be prepared.");
      setRendering(false);
      return;
    }
    setFlowPrompts(data.prompts ?? []);
    toast.success("Flow prompt pack prepared. Generate your clip in Google Flow, export MP4, then upload it below.");
    setRendering(false);
  };

  const uploadFlowExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !renderEntitled || !flowFile) return;
    if (!flowFile.name.toLowerCase().endsWith(".mp4") || flowFile.size > 45 * 1024 * 1024) {
      toast.error("Choose an MP4 file no larger than 45 MiB.");
      return;
    }
    setRendering(true);
    const form = new FormData();
    form.set("file", flowFile);
    form.set("request_id", selected.id);
    form.set("topic", renderTopic.trim());
    form.set("resolution", flowResolution);
    const { data, error } = await supabase.functions.invoke("elite-media-flow-ingest", { body: form });
    if (error || !data?.ok) {
      toast.error(data?.error ?? error?.message ?? "The Flow export could not be ingested.");
      setRendering(false);
      return;
    }
    setFlowFile(null);
    toast.success("Flow MP4 ingested. GitHub Actions will transcode and register the output.");
    setRendering(false);
    await load();
  };

  const pollRender = async (jobId: string) => {
    setPollingJobId(jobId);
    const { data, error } = await supabase.functions.invoke("elite-media-generator", {
      body: { action: "poll_render_job", job_id: jobId },
    });
    if (error || !data?.ok) {
      toast.error(data?.worker?.error ?? error?.message ?? "Could not check this render yet.");
    } else if (data.worker?.status === "ready") {
      toast.success("Your MP4 is ready. Human QA is still required before publication.");
    } else {
      toast.info("Render is still processing. Check again shortly.");
    }
    setPollingJobId("");
    await load();
  };

  if (loading) return <div className="min-h-screen"><Navbar variant="elite-media" brandTo="/dashboard/elite-media" /><main className="container py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></main></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-5xl py-8 md:py-12 space-y-7">
        <header className="grid items-center gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Elite Media · Customer workspace</p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl">Your content operation</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Move from approved footage to polished, reviewed content. Manage your brief, authorized media, consent, trial progress, and subscription status in one workspace.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="bg-gold text-black hover:opacity-90"><Link to="/monetization">Compare plans <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" className="border-gold/40"><Link to="/questionnaire">Start a production brief <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </div>
          <div>
            <EliteMediaShowcaseVideo src="/Creators_preparing_for_professional_content_20261017003431.mp4" title="Elite creator production in action" className="aspect-video w-full rounded-3xl border border-gold/20 shadow-2xl shadow-black/40" />
            <p className="mt-2 text-xs text-muted-foreground">Video plays while visible. Tap the speaker to hear audio.</p>
          </div>
        </header>

        {requests.length > 0 && (
          <section className="grid gap-3 md:grid-cols-2">
            {requests.map((r) => (
              <button key={r.id} type="button" onClick={() => chooseRequest(r.id)} className={`rounded-2xl border p-4 text-left transition ${selectedId === r.id ? "border-gold bg-gold/5" : "border-border glass hover:border-gold/40"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{offers.find((o) => o.value === r.intent)?.label ?? r.intent}</p><p className="mt-1 text-xs text-muted-foreground">Requested {dateLabel(r.created_at)}</p></div>
                  <Badge variant="outline" className="capitalize">{statusLabel(r.status)}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Plan: {statusLabel(r.subscription_status ?? "not_subscribed")}</span>
                  {r.subscription_plan && <span>· {r.subscription_plan}</span>}
                  {r.onboarding_completed_at ? <span>· Brief complete</span> : <span>· Brief incomplete</span>}
                </div>
              </button>
            ))}
          </section>
        )}

        {selected && (
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="glass-strong rounded-2xl p-4"><CalendarClock className="mb-3 h-5 w-5 text-gold" /><p className="text-xs text-muted-foreground">Trial starts</p><p className="mt-1 text-sm font-medium">{dateLabel(selected.trial_starts_at)}</p></div>
            <div className="glass-strong rounded-2xl p-4"><CalendarClock className="mb-3 h-5 w-5 text-gold" /><p className="text-xs text-muted-foreground">Trial ends</p><p className="mt-1 text-sm font-medium">{dateLabel(selected.trial_ends_at)}</p></div>
            <div className="glass-strong rounded-2xl p-4"><ShieldCheck className="mb-3 h-5 w-5 text-gold" /><p className="text-xs text-muted-foreground">Subscription</p><p className="mt-1 text-sm font-medium capitalize">{statusLabel(selected.subscription_status ?? "not_subscribed")}</p><p className="mt-1 text-xs text-muted-foreground">{selected.subscription_plan ?? "No paid plan recorded"}</p></div>
          </section>
        )}

        <form onSubmit={save} className="glass-strong rounded-3xl p-5 md:p-8 space-y-7">
          <div>
            <h2 className="font-display text-2xl">Customer brief</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tell the production team who you are, what you want to achieve, and where your content lives.</p>
          </div>
          {!selected && (
            <div className="space-y-2"><Label>Choose your request</Label><select className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={newIntent} onChange={(e) => setNewIntent(e.target.value)}>{offers.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Creator / business / agency name *</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={120} required placeholder="Name shown to the production team" /></div>
            <div className="space-y-2"><Label>Contact phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="+234…" /></div>
            <div className="space-y-2"><Label>Country *</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} required /></div>
            <div className="space-y-2"><Label>Timezone</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} maxLength={80} placeholder="Africa/Lagos" /></div>
            <div className="space-y-2"><Label>Website or portfolio (HTTPS)</Label><Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} type="url" placeholder="https://…" /></div>
            <div className="space-y-2"><Label>Creator handle(s)</Label><Input value={creatorHandle} onChange={(e) => setCreatorHandle(e.target.value)} maxLength={120} placeholder="@handle / channel name" /></div>
            <div className="space-y-2"><Label>Preferred contact</Label><select className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={preferredContact} onChange={(e) => setPreferredContact(e.target.value)}><option>Email</option><option>Phone</option><option>WhatsApp</option></select></div>
            <div className="space-y-2"><Label>Source media link (HTTPS)</Label><Input value={contentSourceUrl} onChange={(e) => setContentSourceUrl(e.target.value)} type="url" placeholder="Link to footage you own or may authorize" /></div>
          </div>
          <fieldset className="space-y-3"><legend className="text-sm font-medium">Target platforms * — select all that apply</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{platforms.map((platform) => <label key={platform} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={selectedPlatforms.includes(platform)} onChange={() => togglePlatform(platform)} />{platform}</label>)}</div></fieldset>
          <div className="space-y-2"><Label>Goals and production requirements *</Label><Textarea value={goals} onChange={(e) => setGoals(e.target.value)} minLength={10} maxLength={3000} rows={5} required placeholder="What should the content achieve? Audience, deliverables, tone, deadlines, brand rules, captions, languages, accessibility, and any important constraints." /><p className="text-xs text-muted-foreground">{goals.length}/3000 characters</p></div>

          <section className="space-y-4 rounded-2xl border border-gold/25 bg-gold/5 p-4 md:p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" /><div><h3 className="font-semibold">Required consent and media rights</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Your choices are timestamped and attached to this request. Do not submit passwords, access tokens, private account credentials, or media you are not authorized to share.</p></div></div>
            <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} /><span>I accept the Elite Media service terms and understand the agreed scope, deliverables, and trial start date must be confirmed before work begins. *</span></label>
            <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} /><span>I acknowledge the privacy notice and consent to processing the information and media links I submit for this request, support, and service delivery. *</span></label>
            <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={confirmRights} onChange={(e) => setConfirmRights(e.target.checked)} /><span>I own or have permission to provide these media assets and authorize Elite Media to process them for the requested deliverables, subject to agreed scope. *</span></label>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="max-w-xl text-xs leading-5 text-muted-foreground"><FileVideo className="mr-1 inline h-3.5 w-3.5" /> Saving the brief does not activate a trial or subscription, start production, connect social accounts, or charge you. Never enter social passwords or API secrets here.</p>
            <Button type="submit" disabled={saving} className="bg-gold text-primary-foreground">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save customer brief</>}</Button>
          </div>
        </form>

        <section className="glass-strong rounded-3xl p-5 md:p-8 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold">Elite AI Studio</p>
              <h2 className="mt-2 font-display text-2xl">Google Flow → Elite MP4 pipeline</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Use your existing Google Flow consumer access to generate and export the video. Elite ingests the MP4, runs FFmpeg, verifies playback, and registers the derivative. This route does not call the Gemini Developer API or incur Gemini API generation charges.</p>
            </div>
            <Film className="h-6 w-6 text-gold" />
          </div>
          {!selected ? (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Save a customer brief and select it before preparing or uploading a video.</p>
          ) : !renderEntitled ? (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">A valid approved trial or paid entitlement is required before Flow media can be ingested.</p>
          ) : (
            <div className="space-y-5">
              <form onSubmit={startRender} className="space-y-3">
                <Label htmlFor="elite-render-topic">Video brief</Label>
                <Textarea id="elite-render-topic" value={renderTopic} onChange={(e) => setRenderTopic(e.target.value)} maxLength={500} rows={3} required placeholder="Describe the scene, audience, visual style, and intended message. Avoid unsupported claims or copyrighted characters." />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Prepare prompts for Google Flow. This step does not generate video or call a paid API.</p>
                  <Button type="submit" disabled={rendering || !renderTopic.trim()} variant="outline">{rendering ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing…</> : "Prepare Flow prompts"}</Button>
                </div>
              </form>
              {flowPrompts.length > 0 && (
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Flow prompt pack</h3>
                  {flowPrompts.map((item) => (
                    <div key={item.role} className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gold">{item.role} · {item.duration_seconds}s · {item.aspect_ratio}</p>
                      <p className="text-sm leading-6">{item.prompt}</p>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={uploadFlowExport} className="space-y-3 border-t border-border pt-4">
                <h3 className="font-semibold">Upload exported Google Flow MP4</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="elite-flow-file">MP4 export (max 45 MiB)</Label>
                    <input id="elite-flow-file" type="file" accept="video/mp4,.mp4" onChange={(e) => setFlowFile(e.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-border bg-background p-3 text-sm" />
                    {flowFile && <p className="text-xs text-muted-foreground">{flowFile.name} · {(flowFile.size / 1024 / 1024).toFixed(1)} MiB</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="elite-flow-resolution">Output resolution</Label>
                    <select id="elite-flow-resolution" value={flowResolution} onChange={(e) => setFlowResolution(e.target.value as "320p" | "720p")} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
                      <option value="320p">320p · Default</option>
                      <option value="720p">720p · Higher quality</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Technical QA and playback are automated; rights and publication approval remain pending human review.</p>
                  <Button type="submit" disabled={rendering || !flowFile} className="bg-gold text-primary-foreground">{rendering ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</> : <><FileVideo className="mr-2 h-4 w-4" />Upload and queue FFmpeg</>}</Button>
                </div>
              </form>
            </div>
          )}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Recent render jobs</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            </div>
            {renderJobs.filter((job) => !selected || job.request_id === selected.id).length === 0 ? (
              <p className="text-sm text-muted-foreground">No render jobs for this request yet.</p>
            ) : renderJobs.filter((job) => !selected || job.request_id === selected.id).map((job) => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{job.input?.topic ?? "Elite video render"}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{statusLabel(job.status)} · {dateLabel(job.created_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="text-sm text-gold underline underline-offset-4">Open MP4</a>}
                  {["queued", "rendering"].includes(job.status) && <Button type="button" size="sm" variant="outline" disabled={pollingJobId === job.id} onClick={() => void pollRender(job.id)}>{pollingJobId === job.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Check render</Button>}
                </div>
              </div>
            ))}
            <p className="text-xs leading-5 text-muted-foreground">Flow exports are stored with provenance preserved. The registry keeps rights, commercial clearance, and QA pending until reviewed; no asset is auto-published.</p>
          </div>
        </section>

        {selected?.admin_notes && <section className="glass rounded-2xl p-5"><h2 className="font-semibold">Team update</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{selected.admin_notes}</p></section>}
        <p className="text-center text-xs text-muted-foreground">Need to change your offer? <Link to="/monetization" className="text-gold underline underline-offset-4">Review Elite Media plans</Link>.</p>
      </main>
    </div>
  );
}
