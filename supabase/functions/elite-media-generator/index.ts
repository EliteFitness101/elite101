import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "https://elite.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

function isAllowedSourceUrl(raw: string) {
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    const allowed = h === "media.resofit.fit" || h === "content.resofit.fit" ||
      h === "vbqjvmnhdtdhmeeudqnn.supabase.co" || h.endsWith(".public.blob.vercel-storage.com") ||
      h === "www.dropbox.com" || h === "dl.dropboxusercontent.com" ||
      h === "drive.google.com" || h === "drive.usercontent.google.com" || h.endsWith(".googleusercontent.com");
    return u.protocol === "https:" && !u.username && !u.password && allowed;
  } catch { return false; }
}

function promptPack(topic: string, sourceUrl?: string) {
  const subject = topic.trim().slice(0, 500);
  const base = "Create original, rights-cleared, premium vertical social video for Elite Media. 9:16 portrait, clear subject, strong first 1.5 seconds, natural motion, clean framing for captions, no fabricated testimonials, no unverified claims, no logos or text artifacts, no copyrighted characters or music. Deliver a clean final frame suitable for a CTA overlay.";
  return {
    provider: "Google Gemini Omni Flash",
    provider_mode: "gemini_api_automation",
    topic: subject,
    source_media_url: sourceUrl || null,
    prompts: [
      { role: "hero_hook", duration_seconds: 8, aspect_ratio: "9:16", prompt: base + " Hook concept: " + subject + ". Immediate visual hook, cinematic movement, readable focal point." },
      { role: "story", duration_seconds: 8, aspect_ratio: "9:16", prompt: base + " Build a concise visual story around: " + subject + ". Establish context, show the process, end with a clear visual payoff." },
      { role: "educational", duration_seconds: 8, aspect_ratio: "9:16", prompt: base + " Explain visually: " + subject + ". Use three simple visual beats; leave clean space for text overlays added in post." },
      { role: "call_to_action", duration_seconds: 8, aspect_ratio: "9:16", prompt: base + " Conversion creative for: " + subject + ". End with uncluttered negative space for an accurate CTA added in post." }
    ],
    site_experience_assets: [
      { site_slot: "hero_background", duration_seconds: 6, aspect_ratio: "16:9", prompt: "Create a seamless-feeling 6-second landscape website hero for Elite NG, a global creator production and media automation workspace. Premium obsidian-black studio, subtle glass reflections and champagne-gold light, confident diverse African and international creators collaborating with cameras and editing displays, cinematic slow dolly movement, elegant negative space for real website copy layered in the UI. No readable fake interface text, no logos, no invented results, no testimonials, no copyrighted music." },
      { site_slot: "dashboard_intro", duration_seconds: 6, aspect_ratio: "16:9", prompt: "Create a premium 6-second landscape product walkthrough visual for the Elite NG creator dashboard: a creator calmly organizing approved clips, reviewing a timeline, and seeing a polished MP4 delivery card. Obsidian and champagne-gold visual language, realistic screens with abstract unreadable UI only, no fake metrics or unsupported features." },
      { site_slot: "registration_walkthrough", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a mobile-first 6-second vertical onboarding guide for a global creator joining Elite NG: open the creator workspace, enter account details, confirm email, and arrive at a clean welcome dashboard. Use abstract UI shapes without legible fake text; reassuring, accessible, premium, fast and frictionless." },
      { site_slot: "plan_comparison", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical visual guide showing a creator comparing a one-time launch pack, a monthly creator workspace, and managed agency production. Clear visual distinction between one-time, subscription and consultation-led service; no prices, no invented quotas, no claims beyond the plan labels." },
      { site_slot: "media_generation_walkthrough", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical workflow guide: creator enters a concise video brief, Gemini generates an original clip, FFmpeg renders an MP4, and a verified delivery asset appears in the media library. Show only abstract visual stages, no fake status labels or fabricated metrics." },
      { site_slot: "publishing_walkthrough", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical guide showing approved creator media moving through caption preparation, rights and quality review, connected social channel selection, and scheduled publishing. Make clear that publishing happens only for active, verified integrations; no platform logos or unsupported automation claims." },
      { site_slot: "hr_assistant_walkthrough", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical guide introducing Mavia, Elite NG's HR and concierge assistant: a creator asks a professional question, receives a clear organized response, and sees a next-step checklist. Do not show private personal data, fake chat text, or unsupported hiring guarantees." },
      { site_slot: "offer:highlight-launch-pack", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical card video for Elite NG Highlight Launch Pack, a one-time creator launch offer: a creator turns a short brief into a polished highlight clip, reviews the MP4 and prepares a caption. Premium, realistic, no invented deliverables, results or guarantees." },
      { site_slot: "offer:creator-starter", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical card video for Elite NG Creator Starter: a creator organizes an approved clip, reviews a simple caption and prepares a posting plan. Premium, realistic, no invented plan limits or outcomes." },
      { site_slot: "offer:creator-pro", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical card video for Elite NG Creator Pro: a frequent creator coordinates several content pieces and reviews brand presets in a polished workspace. Premium, realistic, no invented plan limits or outcomes." },
      { site_slot: "offer:agency-workspace", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical card video for Elite NG Agency Workspace: a small team coordinates creator assets, briefs and approvals in one shared production view. Premium, realistic, no invented team-size limits or results." },
      { site_slot: "offer:agency-production-retainer", duration_seconds: 6, aspect_ratio: "9:16", prompt: "Create a 6-second vertical card video for Elite NG Agency Production Retainer: a brand team reviews a production brief, aligns on a managed creative workflow and approves a delivery plan after consultation. Premium, realistic, no invented deliverables or guarantees." }
    ],
    render_profiles: {
      mp4_320p: { container: "mp4", video_codec: "libx264", width: 180, height: 320, fps: 24, pixel_format: "yuv420p", audio_codec: "aac", audio_bitrate: "64k", video_bitrate: "350k", faststart: true },
      mp4_720p: { container: "mp4", video_codec: "libx264", width: 405, height: 720, fps: 30, pixel_format: "yuv420p", audio_codec: "aac", audio_bitrate: "96k", video_bitrate: "1200k", faststart: true },
      hls: { container: "m3u8+ts", video_codec: "libx264", audio_codec: "aac", segment_seconds: 6, playlist: "master.m3u8", variants: ["320p", "720p"] }
    },
    ffmpeg_templates: {
      mp4_320p: "ffmpeg -i INPUT -vf \"scale=180:320:force_original_aspect_ratio=decrease,pad=180:320:(ow-iw)/2:(oh-ih)/2,fps=24,format=yuv420p\" -c:v libx264 -preset medium -b:v 350k -maxrate 450k -bufsize 700k -c:a aac -b:a 64k -movflags +faststart OUTPUT_320p.mp4",
      hls: "ffmpeg -i INPUT -filter_complex \"[0:v]split=2[v320][v720];[v320]scale=180:320:force_original_aspect_ratio=decrease,pad=180:320:(ow-iw)/2:(oh-ih)/2[v0];[v720]scale=405:720:force_original_aspect_ratio=decrease,pad=405:720:(ow-iw)/2:(oh-ih)/2[v1]\" -map \"[v0]\" -map 0:a? -c:v:0 libx264 -b:v:0 350k -c:a:0 aac -b:a:0 64k -map \"[v1]\" -map 0:a? -c:v:1 libx264 -b:v:1 1200k -c:a:1 aac -b:a:1 96k -f hls -hls_time 6 -hls_playlist_type vod -var_stream_map \"v:0,a:0 v:1,a:1\" -master_pl_name master.m3u8 -hls_segment_filename \"variant_%v/segment_%03d.ts\" variant_%v/index.m3u8"
    },
    player: { autoplay: true, muted: true, playsInline: true, defaultVolume: 0.33, animatedUnmuteControl: true, floatingControls: true, hlsPreferred: true },
    execution_status: "prompt_ready; create_render_job submits to the connected Gemini Omni API worker and FFmpeg queue"
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return reply({ ok: false, error: "authentication_required" }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user || !user.email_confirmed_at) return reply({ ok: false, error: "verified_account_required" }, 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "generate_prompts");
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 4000) : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : prompt.slice(0, 500);
    const aspectRatio = body.aspect_ratio === "16:9" ? "16:9" : "9:16";
    if ((!topic && !prompt) || topic.length > 500) return reply({ ok: false, error: "topic_or_prompt_required_max_500_chars" }, 400);
    const sourceUrl = typeof body.source_media_url === "string" ? body.source_media_url.trim() : "";
    if (sourceUrl && !isAllowedSourceUrl(sourceUrl)) return reply({ ok: false, error: "source_media_host_not_allowed" }, 400);

    const { data: requests, error: requestError } = await admin.from("elite_media_requests")
      .select("id,status,subscription_status,trial_starts_at,trial_ends_at")
      .eq("user_id", user.id)
      .in("status", ["approved", "in_progress"])
      .order("created_at", { ascending: false }).limit(10);
    if (requestError) throw requestError;
    const now = Date.now();
    const active = (requests || []).find((r: any) =>
      (r.subscription_status === "trial" && r.trial_starts_at && r.trial_ends_at &&
       new Date(r.trial_starts_at).getTime() <= now && new Date(r.trial_ends_at).getTime() > now) ||
      ["active", "paid", "subscribed"].includes(String(r.subscription_status || "").toLowerCase())
    );
    if (!active) return reply({ ok: false, error: "active_elite_media_trial_or_subscription_required" }, 403);

    const spec = promptPack(topic, sourceUrl || undefined);
    if (action === "generate_prompts") {
      const { data: job, error } = await admin.from("elite_media_generation_jobs").insert({
        user_id: user.id, request_id: active.id, job_type: "prompt_pack", status: "prompt_ready",
        input: { topic, source_media_url: sourceUrl || null },
        output: spec, source_url: sourceUrl || null
      }).select("id,status,created_at").single();
      if (error) throw error;
      return reply({ ok: true, job, ...spec });
    }
    if (action === "create_render_job") {
      if (body.output_format === "hls") {
        return reply({ ok: false, error: "hls_transcode_worker_not_connected", supported_output_format: "mp4" }, 409);
      }
      if (body.resolution && !["320p", "720p"].includes(String(body.resolution))) {
        return reply({ ok: false, error: "unsupported_resolution", supported_resolutions: ["320p", "720p"] }, 409);
      }
      const resolution = body.resolution === "720p" ? "720p" : "320p";
      const siteSlot = typeof body.site_slot === "string" && /^[a-z0-9:_-]{1,80}$/i.test(body.site_slot.trim()) ? body.site_slot.trim() : "";
      const campaign = siteSlot ? "elite_site_onboarding" : "elite_media_generation";
      const durationSeconds = Number.isInteger(body.duration_seconds) && body.duration_seconds >= 3 && body.duration_seconds <= 10 ? body.duration_seconds : 6;
      const { data: job, error } = await admin.from("elite_media_generation_jobs").insert({
        user_id: user.id, request_id: active.id,
        job_type: "video_render",
        status: "queued", input: { topic, prompt: prompt || topic, aspect_ratio: aspectRatio, source_media_url: sourceUrl || null, output_format: "mp4", resolution, duration_seconds: durationSeconds, site_slot: siteSlot || null, start_automatically: true },
        output: { brand: "Elite NG", campaign, site_slot: siteSlot || null, provider: "google_gemini_omni", render_profiles: spec.render_profiles, ffmpeg_templates: spec.ffmpeg_templates, player: spec.player },
        source_url: sourceUrl || null
      }).select("id,status,created_at").single();
      if (error) throw error;
      const workerResponse = await fetch(`${url}/functions/v1/elite-media-render-worker`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "start", job_id: job.id }),
        signal: AbortSignal.timeout(35000),
      });
      const workerBody = await workerResponse.json().catch(() => null);
      if (!workerResponse.ok) {
        const { data: latestJob } = await admin.from("elite_media_generation_jobs").select("status,output").eq("id", job.id).eq("user_id", user.id).maybeSingle();
        await admin.from("elite_media_generation_jobs").update({
          status: latestJob?.status || "failed",
          output: { ...(latestJob?.output || {}), worker_dispatch_error: workerBody?.error || "render_worker_start_failed", worker_status: workerResponse.status },
          updated_at: new Date().toISOString(),
        }).eq("id", job.id).eq("user_id", user.id);
        return reply({ ok: false, error: "render_worker_start_failed", job, worker: workerBody }, 502);
      }
      return reply({ ok: true, job, worker: workerBody, execution_status: workerBody?.status === "queued" ? "Gemini Omni job queued for provider capacity or source-file processing; the scheduled poller will retry" : "Gemini Omni API render submitted; FFmpeg will produce the selected MP4 profile, then poll_render_job to retrieve the completed MP4" }, 202);
    }
    if (action === "poll_render_job") {
      const jobId = typeof body.job_id === "string" ? body.job_id.trim() : "";
      if (!jobId) return reply({ ok: false, error: "job_id_required" }, 400);
      const workerResponse = await fetch(`${url}/functions/v1/elite-media-render-worker`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "poll", job_id: jobId }),
        signal: AbortSignal.timeout(65000),
      });
      const workerBody = await workerResponse.json().catch(() => null);
      return reply({ ok: workerResponse.ok, worker: workerBody }, workerResponse.status);
    }
    return reply({ ok: false, error: "unsupported_action", supported_actions: ["generate_prompts", "create_render_job", "poll_render_job"] }, 400);
  } catch (e) {
    console.error("elite-media-generator", e);
    return reply({ ok: false, error: "generation_request_failed" }, 500);
  }
});