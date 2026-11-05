import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const VIDEO_MODEL = "gemini-omni-1.1-flash";
const BUCKET = "resofit-paid-deliverables";
const cors = {
  "Access-Control-Allow-Origin": "https://elite.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

async function geminiKey() {
  const { data, error } = await admin.rpc("get_digital_product_factory_gemini_key");
  if (error || !data) throw new Error("gemini_api_key_missing");
  return String(data);
}

async function getOwnedJob(jobId: string, userId: string) {
  const { data: job, error } = await admin.from("elite_media_generation_jobs")
    .select("id,user_id,request_id,job_type,status,input,output,source_url,output_url,created_at")
    .eq("id", jobId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!job) return null;
  const { data: request, error: requestError } = await admin.from("elite_media_requests")
    .select("id,status,subscription_status,trial_starts_at,trial_ends_at")
    .eq("id", job.request_id).eq("user_id", userId).maybeSingle();
  if (requestError) throw requestError;
  if (!request || !["approved", "in_progress"].includes(request.status)) return null;
  const now = Date.now();
  const entitled = request.subscription_status === "trial"
    ? !!request.trial_starts_at && !!request.trial_ends_at &&
      new Date(request.trial_starts_at).getTime() <= now &&
      new Date(request.trial_ends_at).getTime() > now
    : ["active", "paid", "subscribed"].includes(String(request.subscription_status || "").toLowerCase());
  return entitled ? { job, request } : null;
}

async function ensureBucket() {
  const current = await admin.storage.getBucket(BUCKET);
  if (current.error || !current.data) throw new Error("private_raw_media_bucket_unavailable");
  if (current.data.public !== false) throw new Error("raw_media_bucket_must_remain_private");
  if (Number(current.data.file_size_limit || 0) < 45 * 1024 * 1024) throw new Error("raw_media_bucket_limit_below_45_mib");
}

async function uploadVideo(job: any, bytes: Uint8Array) {
  if (bytes.byteLength < 12 || bytes.byteLength > 45 * 1024 * 1024 || new TextDecoder().decode(bytes.slice(4, 8)) !== "ftyp") throw new Error("provider_output_failed_mp4_signature_or_size_validation");
  const path = `elite-media/${job.user_id}/${job.id}/final.mp4`;
  const bucket = admin.storage.from(BUCKET);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2, "0")).join("");
  const uploaded = await bucket.upload(path, bytes, { contentType: "video/mp4", upsert: true });
  if (uploaded.error) throw uploaded.error;
  const readback = await bucket.download(path);
  if (readback.error || !readback.data) throw new Error("private_raw_mp4_readback_failed");
  const readbackBytes = new Uint8Array(await readback.data.arrayBuffer());
  const readbackDigest = await crypto.subtle.digest("SHA-256", readbackBytes);
  const readbackSha256 = Array.from(new Uint8Array(readbackDigest)).map(v => v.toString(16).padStart(2, "0")).join("");
  if (readbackBytes.byteLength !== bytes.byteLength || readbackSha256 !== sha256) throw new Error("private_raw_mp4_integrity_check_failed");
  return { path, bytes: bytes.byteLength, sha256 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return reply({ ok: false, error: "authentication_required" }, 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");
    const tokenParts = token.split(".");
    let tokenRole = "";
    try {
      const encodedPayload = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
      const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
      const payload = JSON.parse(atob(paddedPayload));
      tokenRole = String(payload.role || "");
    } catch { tokenRole = ""; }
    const internalServiceRequest = tokenRole === "service_role" && ["start", "poll"].includes(action);
    let userId = "";
    if (internalServiceRequest) {
      userId = String(body.user_id || "").trim();
      if (!userId) return reply({ ok: false, error: "internal_poll_user_id_required" }, 400);
    } else {
      const { data: { user }, error: authError } = await admin.auth.getUser(token);
      if (authError || !user || !user.email_confirmed_at) return reply({ ok: false, error: "verified_account_required" }, 401);
      userId = user.id;
    }
    const jobId = String(body.job_id || "").trim();
    if (!jobId) return reply({ ok: false, error: "job_id_required" }, 400);
    const owned = await getOwnedJob(jobId, userId);
    if (!owned) return reply({ ok: false, error: "entitled_job_not_found" }, 404);
    const job = owned.job;
    if (internalServiceRequest && action === "start" && job.input?.start_automatically !== true) {
      return reply({ ok: false, error: "automatic_start_not_enabled_for_job" }, 403);
    }
    if (job.job_type !== "video_render") return reply({ ok: false, error: "mp4_video_render_jobs_only; hls_requires_a_separate_transcode_worker" }, 409);
    const output = { ...(job.output || {}) };

    if (action === "status") {
      return reply({ ok: true, job_id: job.id, status: job.status, output_url: job.output_url, output });
    }

    const key = await geminiKey();
    if (action === "start") {
      await ensureBucket();
      if (output.provider_interaction_id && job.status === "rendering") return reply({ ok: true, job_id: job.id, status: job.status, interaction_submitted: true });
      if (job.status !== "queued" && job.status !== "failed") return reply({ ok: false, error: "job_not_startable", status: job.status }, 409);
      const topic = String(job.input?.topic || "").trim();
      const customPrompt = String(job.input?.prompt || "").trim();
      const aspectRatio = job.input?.aspect_ratio === "16:9" ? "16:9" : "9:16";
      if (!topic && !customPrompt) return reply({ ok: false, error: "render_prompt_missing" }, 400);
      delete output.provider_operation;
      delete output.provider_interaction_id;
      delete output.provider_video_uri;
      delete output.provider_error;
      delete output.provider_http_status;
      const prompt = (customPrompt || ("Create an original, rights-cleared Elite Media video about: " + topic +
        ". " + (aspectRatio === "16:9" ? "Landscape 16:9 website hero composition." : "Portrait 9:16 mobile-first composition.") +
        " Premium obsidian and champagne-gold visual direction, clear subject, natural cinematic motion, accurate claims only, no fake interface text, no logos, no copyrighted characters or music.")).slice(0, 5000);
      const response = await fetch(`${GEMINI_API}/interactions`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          model: VIDEO_MODEL,
          input: prompt,
          background: true,
          response_format: { type: "video", delivery: "uri", aspect_ratio: aspectRatio },
          generation_config: { video_config: { task: "text_to_video" } },
        }),
        signal: AbortSignal.timeout(30000),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.id) {
        const reason = String(payload?.error?.message || payload?.message || "provider_request_rejected").slice(0, 240);
        await admin.from("elite_media_generation_jobs").update({ status: "failed", output: { ...output, provider_error: reason, provider_http_status: response.status }, updated_at: new Date().toISOString() }).eq("id", job.id);
        return reply({ ok: false, error: "video_provider_submission_failed", provider_status: response.status, detail: reason }, 502);
      }
      output.provider = "google_gemini_omni";
      output.model = VIDEO_MODEL;
      output.provider_interaction_id = payload.id;
      output.aspect_ratio = aspectRatio;
      const initialVideo = (payload?.steps || []).filter((step: any) => step?.type === "model_output").flatMap((step: any) => Array.isArray(step?.content) ? step.content : []).find((item: any) => item?.type === "video") || payload?.output_video || null;
      if (typeof initialVideo?.uri === "string") output.provider_video_uri = initialVideo.uri;
      output.provider_status = payload.status || "in_progress";
      output.submitted_at = new Date().toISOString();
      const { error } = await admin.from("elite_media_generation_jobs")
        .update({ status: "rendering", output, updated_at: new Date().toISOString() }).eq("id", job.id);
      if (error) throw error;
      return reply({ ok: true, job_id: job.id, status: "rendering", interaction_submitted: true }, 202);
    }

    if (action === "poll") {
      if (output.ffmpeg_render_pending === true) {
        return reply({ ok: true, job_id: job.id, status: "rendering", ffmpeg_queued: true, resolution: output.ffmpeg_resolution || "320p" }, 202);
      }
      if (job.status === "ready" && job.output_url) {
        return reply({ ok: true, job_id: job.id, status: "ready", output_url: job.output_url, asset_id: output.asset_id || null, qa_status: output.qa_status || "pending" });
      }
      const interactionId = String(output.provider_interaction_id || "");
      if (!interactionId) return reply({ ok: false, error: "provider_interaction_not_submitted" }, 409);
      const poll = await fetch(`${GEMINI_API}/interactions/${encodeURIComponent(interactionId)}`, {
        headers: { "x-goog-api-key": key },
        signal: AbortSignal.timeout(30000),
      });
      const state = await poll.json().catch(() => null);
      if (!poll.ok) return reply({ ok: false, error: "video_provider_poll_failed", provider_status: poll.status }, 502);
      if (state?.status === "failed") {
        const providerFailure = {
          status: state?.status || null,
          error: state?.error ?? null,
          error_message: state?.error_message ?? null,
          finish_reason: state?.finish_reason ?? null,
          steps: (Array.isArray(state?.steps) ? state.steps : []).map((step: any) => ({
            type: step?.type ?? null,
            status: step?.status ?? null,
            error: step?.error ?? step?.error_message ?? null,
            content_types: Array.isArray(step?.content) ? step.content.map((item: any) => item?.type || "unknown") : [],
          })),
          response_keys: Object.keys(state || {}).slice(0, 40),
        };
        output.provider_error = String(state?.error?.message || state?.error || state?.error_message || "video_generation_failed").slice(0, 1000);
        output.provider_failure = providerFailure;
        output.provider_status = "failed";
        console.error("Gemini Omni generation failed", JSON.stringify(providerFailure).slice(0, 3000));
        await admin.from("elite_media_generation_jobs").update({ status: "failed", output, updated_at: new Date().toISOString() }).eq("id", job.id);
        return reply({ ok: false, error: "video_generation_failed", provider_failure: providerFailure }, 502);
      }
      if (state?.status !== "completed") return reply({ ok: true, job_id: job.id, status: "rendering", completed: false }, 202);
      const videoBlock = output.provider_video_uri ? { uri: output.provider_video_uri } :
        (state?.steps || []).filter((step: any) => step?.type === "model_output")
          .flatMap((step: any) => Array.isArray(step?.content) ? step.content : [])
          .find((item: any) => item?.type === "video") || state?.output_video || null;
      let bytes: Uint8Array;
      if (typeof videoBlock?.data === "string" && videoBlock.data.length > 0) {
        const binary = atob(videoBlock.data);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      } else if (typeof videoBlock?.uri === "string" && videoBlock.uri.length > 0) {
        const fileId = videoBlock.uri.match(/(?:^|\/)files\/([^/?#:]+)/)?.[1] || "";
        if (!fileId) throw new Error("video_provider_file_uri_invalid");
        const fileInfoResponse = await fetch(`${GEMINI_API}/files/${encodeURIComponent(fileId)}`, {
          headers: { "x-goog-api-key": key },
          signal: AbortSignal.timeout(20000),
        });
        const fileInfo = await fileInfoResponse.json().catch(() => null);
        if (!fileInfoResponse.ok) throw new Error("video_provider_file_status_failed");
        if (fileInfo?.state === "FAILED") throw new Error("video_provider_file_failed");
        if (fileInfo?.state !== "ACTIVE") return reply({ ok: true, job_id: job.id, status: "rendering", file_state: fileInfo?.state || "PROCESSING" }, 202);
        const download = await fetch(`${GEMINI_API}/files/${encodeURIComponent(fileId)}:download?alt=media`, {
          headers: { "x-goog-api-key": key },
          signal: AbortSignal.timeout(60000),
        });
        if (!download.ok) throw new Error("video_provider_download_failed");
        bytes = new Uint8Array(await download.arrayBuffer());
      } else {
        throw new Error("video_provider_output_missing");
      }
      if (bytes.byteLength < 1024) throw new Error("video_output_too_small");
      const stored = await uploadVideo(job, bytes);
      output.provider = "google_gemini_omni";
      output.model = VIDEO_MODEL;
      output.mime_type = "video/mp4";
      output.byte_size = stored.bytes;
      output.storage_bucket = BUCKET;
      output.storage_path = stored.path;
      output.sha256 = stored.sha256;
      output.raw_readback_verified = true;
      output.ffmpeg_render_pending = true;
      output.ffmpeg_resolution = job.input?.resolution === "720p" ? "720p" : "320p";
      output.qa_status = "pending";
      output.ffmpeg_queued_at = new Date().toISOString();
      output.completed_at = new Date().toISOString();
      const { error: updateError } = await admin.from("elite_media_generation_jobs")
        .update({ status: "rendering", output_url: null, output, updated_at: new Date().toISOString() }).eq("id", job.id);
      if (updateError) throw updateError;
      return reply({ ok: true, job_id: job.id, status: "rendering", ffmpeg_queued: true, raw_readback_verified: true, resolution: output.ffmpeg_resolution }, 202);
    }

    return reply({ ok: false, error: "unsupported_action", supported_actions: ["start", "poll", "status"] }, 400);
  } catch (error) {
    console.error("elite-media-render-worker", String(error));
    return reply({ ok: false, error: "render_worker_failed", detail: error instanceof Error ? error.message.slice(0, 240) : "unknown" }, 500);
  }
});