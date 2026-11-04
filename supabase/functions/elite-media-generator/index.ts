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

function promptPack(topic: string, sourceUrl?: string) {
  const subject = topic.trim().slice(0, 500);
  const base = "Create original, rights-cleared, premium vertical social video for Elite Media. 9:16 portrait, clear subject, strong first 1.5 seconds, natural motion, clean framing for captions, no fabricated testimonials, no unverified claims, no logos or text artifacts, no copyrighted characters or music. Deliver a clean final frame suitable for a CTA overlay.";
  return {
    provider: "Google Flow",
    provider_mode: "prompt_export",
    topic: subject,
    source_media_url: sourceUrl || null,
    prompts: [
      { role: "hero_hook", duration_seconds: 8, aspect_ratio: "9:16", prompt: base + " Hook concept: " + subject + ". Immediate visual hook, cinematic movement, readable focal point." },
      { role: "story", duration_seconds: 8, aspect_ratio: "9:16", prompt: base + " Build a concise visual story around: " + subject + ". Establish context, show the process, end with a clear visual payoff." },
      { role: "educational", duration_seconds: 8, aspect_ratio: "9:16", prompt: base + " Explain visually: " + subject + ". Use three simple visual beats; leave clean space for text overlays added in post." },
      { role: "call_to_action", duration_seconds: 8, aspect_ratio: "9:16", prompt: base + " Conversion creative for: " + subject + ". End with uncluttered negative space for an accurate CTA added in post." }
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
    execution_status: "prompt_and_render_spec_ready; actual rendering requires a connected FFmpeg-capable worker or video-generation provider"
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
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const sourceUrl = typeof body.source_media_url === "string" ? body.source_media_url.trim() : "";
    const needsTopic = action === "generate_prompts" || action === "create_render_job";
    if (needsTopic && (!topic || topic.length > 500)) return reply({ ok: false, error: "topic_required_max_500_chars" }, 400);
    if (needsTopic && sourceUrl && !/^https:\/\//i.test(sourceUrl)) return reply({ ok: false, error: "source_media_url_must_be_https" }, 400);

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
      if (sourceUrl) {
        return reply({ ok: false, error: "source_media_editing_not_enabled_for_prompt_to_video_worker", supported_mode: "prompt_to_video" }, 409);
      }
      if (body.resolution && !["320p", "720p"].includes(body.resolution)) {
        return reply({ ok: false, error: "unsupported_resolution", supported_resolutions: ["320p", "720p"] }, 409);
      }
      const outputResolution = body.resolution === "720p" ? "720p" : "320p";
      const { data: job, error } = await admin.from("elite_media_generation_jobs").insert({
        user_id: user.id, request_id: active.id,
        job_type: "video_render",
        status: "queued", input: { topic, source_media_url: sourceUrl || null, output_format: "mp4", resolution: outputResolution },
        output: { render_profiles: spec.render_profiles, ffmpeg_templates: spec.ffmpeg_templates, player: spec.player },
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
        await admin.from("elite_media_generation_jobs").update({
          status: "failed",
          output: { worker_dispatch_error: workerBody?.error || "render_worker_start_failed", worker_status: workerResponse.status },
          updated_at: new Date().toISOString(),
        }).eq("id", job.id).eq("user_id", user.id);
        return reply({ ok: false, error: "render_worker_start_failed", job, worker: workerBody }, 502);
      }
      return reply({ ok: true, job, worker: workerBody, execution_status: "Gemini video generation submitted; GitHub Actions FFmpeg runner finalizes the MP4" }, 202);
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