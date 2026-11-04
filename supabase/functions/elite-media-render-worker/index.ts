import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const VIDEO_MODEL = "veo-3.1-generate-preview";
const BUCKET = "digital-product-media";
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
  if (current.data) {
    if (current.data.public !== true) throw new Error("media_bucket_must_be_public_for_delivery");
    return;
  }
  const created = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 524288000 });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
  const verified = await admin.storage.getBucket(BUCKET);
  if (!verified.data || verified.data.public !== true) throw new Error("media_bucket_provisioning_failed");
}

async function uploadVideo(job: any, bytes: Uint8Array) {
  const path = `elite-media/${job.user_id}/${job.id}/final.mp4`;
  const bucket = admin.storage.from(BUCKET);
  let result = await bucket.upload(path, bytes, { contentType: "video/mp4", upsert: true });
  if (result.error) {
    const created = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 524288000 });
    if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
    result = await bucket.upload(path, bytes, { contentType: "video/mp4", upsert: true });
  }
  if (result.error) throw result.error;
  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
  const verify = await fetch(publicUrl, { method: "HEAD", redirect: "follow" });
  const contentType = (verify.headers.get("content-type") || "").toLowerCase();
  if (!verify.ok || !contentType.startsWith("video/")) throw new Error("uploaded_mp4_public_verification_failed");
  return { path, publicUrl, contentType, bytes: bytes.byteLength };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer\\s+(.+)$/i)?.[1];
    if (!token) return reply({ ok: false, error: "authentication_required" }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user || !user.email_confirmed_at) return reply({ ok: false, error: "verified_account_required" }, 401);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");
    const jobId = String(body.job_id || "").trim();
    if (!jobId) return reply({ ok: false, error: "job_id_required" }, 400);
    const owned = await getOwnedJob(jobId, user.id);
    if (!owned) return reply({ ok: false, error: "entitled_job_not_found" }, 404);
    const job = owned.job;
    if (job.job_type !== "video_render") return reply({ ok: false, error: "mp4_video_render_jobs_only; hls_requires_a_separate_transcode_worker" }, 409);
    const output = { ...(job.output || {}) };

    if (action === "status") {
      return reply({ ok: true, job_id: job.id, status: job.status, output_url: job.output_url, output });
    }

    const key = await geminiKey();
    if (action === "start") {
      await ensureBucket();
      if (output.provider_operation && job.status === "rendering") return reply({ ok: true, job_id: job.id, status: job.status, operation_submitted: true });
      if (job.status === "failed") {
        delete output.provider_operation;
        delete output.provider_error;
        delete output.provider_http_status;
      }
      if (job.status !== "queued" && job.status !== "failed") return reply({ ok: false, error: "job_not_startable", status: job.status }, 409);
      const topic = String(job.input?.topic || "").trim();
      if (!topic) return reply({ ok: false, error: "render_topic_missing" }, 400);
      const prompt = "Create an original, rights-cleared premium vertical social video for Elite Media. Topic: " + topic.slice(0, 500) +
        ". 9:16 portrait, 8 seconds, 720p, clear subject, strong first 1.5 seconds, natural motion, polished Nigerian/African lifestyle context where relevant, no fabricated testimonials, no unverified claims, no logos or text artifacts, no copyrighted characters or music. End with a clean final frame suitable for an accurate CTA overlay.";
      const response = await fetch(`${GEMINI_BASE}/models/${VIDEO_MODEL}:predictLongRunning`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: "9:16", durationSeconds: 8, resolution: "720p" } }),
        signal: AbortSignal.timeout(30000),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.name) {
        const reason = String(payload?.error?.message || payload?.message || "provider_request_rejected").slice(0, 240);
        await admin.from("elite_media_generation_jobs").update({ status: "failed", output: { ...output, provider_error: reason, provider_http_status: response.status }, updated_at: new Date().toISOString() }).eq("id", job.id);
        return reply({ ok: false, error: "video_provider_submission_failed", provider_status: response.status, detail: reason }, 502);
      }
      output.provider = "google_gemini_veo";
      output.model = VIDEO_MODEL;
      output.provider_operation = payload.name;
      output.submitted_at = new Date().toISOString();
      const { error } = await admin.from("elite_media_generation_jobs")
        .update({ status: "rendering", output, updated_at: new Date().toISOString() }).eq("id", job.id);
      if (error) throw error;
      return reply({ ok: true, job_id: job.id, status: "rendering", operation_submitted: true }, 202);
    }

    if (action === "poll") {
      const operation = String(output.provider_operation || "");
      if (!operation) return reply({ ok: false, error: "provider_operation_not_submitted" }, 409);
      const poll = await fetch(`${GEMINI_BASE}/${operation}`, {
        headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(20000),
      });
      const state = await poll.json().catch(() => null);
      if (!poll.ok) return reply({ ok: false, error: "video_provider_poll_failed", provider_status: poll.status }, 502);
      if (!state?.done) return reply({ ok: true, job_id: job.id, status: "rendering", completed: false }, 202);
      if (state.error) {
        output.provider_error = String(state.error.message || "video_generation_failed").slice(0, 240);
        await admin.from("elite_media_generation_jobs").update({ status: "failed", output, updated_at: new Date().toISOString() }).eq("id", job.id);
        return reply({ ok: false, error: "video_generation_failed" }, 502);
      }
      const videoUri = state?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!videoUri) throw new Error("video_provider_output_missing");
      const download = await fetch(videoUri, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(60000) });
      if (!download.ok) throw new Error("video_provider_download_failed");
      const bytes = new Uint8Array(await download.arrayBuffer());
      if (bytes.byteLength < 1024) throw new Error("video_output_too_small");
      const stored = await uploadVideo(job, bytes);
      const sourceAssetId = `${job.id}:veo-v1`;
      const { data: asset, error: assetError } = await admin.from("content_asset_registry").upsert({
        source_provider: "elite_gemini_veo",
        source_asset_id: sourceAssetId,
        source_url: stored.publicUrl,
        canonical_url: stored.publicUrl,
        brand: "Elite NG",
        campaign: "elite_media_generation",
        asset_type: "video",
        mime_type: "video/mp4",
        rights_status: "gemini_api_generated",
        commercial_status: "elite_media_generated",
        qa_status: "pending",
        qa_reason: "AI-generated Elite Media output; human and platform QA required before publication.",
        content_pillar: "ELITE_MEDIA",
        intelligence: { elite_job_id: job.id, user_id: user.id, provider: "Google Gemini API", model: VIDEO_MODEL, output_format: "mp4", duration_seconds: 8 },
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "source_provider,source_asset_id" }).select("id,canonical_url,asset_type,qa_status").single();
      if (assetError) throw assetError;
      output.asset_id = asset.id;
      output.provider = "google_gemini_veo";
      output.model = VIDEO_MODEL;
      output.mime_type = "video/mp4";
      output.byte_size = stored.bytes;
      output.storage_path = stored.path;
      output.qa_status = "pending";
      output.completed_at = new Date().toISOString();
      const { error: updateError } = await admin.from("elite_media_generation_jobs")
        .update({ status: "ready", output_url: stored.publicUrl, output, updated_at: new Date().toISOString() }).eq("id", job.id);
      if (updateError) throw updateError;
      return reply({ ok: true, job_id: job.id, status: "ready", output_url: stored.publicUrl, asset_id: asset.id, qa_status: "pending" });
    }

    return reply({ ok: false, error: "unsupported_action", supported_actions: ["start", "poll", "status"] }, 400);
  } catch (error) {
    console.error("elite-media-render-worker", String(error));
    return reply({ ok: false, error: "render_worker_failed", detail: error instanceof Error ? error.message.slice(0, 240) : "unknown" }, 500);
  }
});