import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const BUCKET = "digital-product-media";
const MAX_BYTES = 45 * 1024 * 1024;
const cors = {
  "Access-Control-Allow-Origin": "https://elite.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const sha256 = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer\\s+(.+)$/i)?.[1];
    if (!token) return reply({ ok: false, error: "authentication_required" }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user || !user.email_confirmed_at) return reply({ ok: false, error: "verified_account_required" }, 401);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return reply({ ok: false, error: "mp4_file_required" }, 400);
    if (!file.name.toLowerCase().endsWith(".mp4") || (file.type && file.type !== "video/mp4" && file.type !== "application/octet-stream")) {
      return reply({ ok: false, error: "mp4_file_required" }, 415);
    }
    if (file.size < 1024 || file.size > MAX_BYTES) return reply({ ok: false, error: "file_size_out_of_range", max_bytes: MAX_BYTES }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(4, 8)) !== "ftyp") return reply({ ok: false, error: "invalid_mp4_signature" }, 415);

    const requestId = String(form.get("request_id") || "").trim();
    if (!requestId) return reply({ ok: false, error: "request_id_required" }, 400);
    const { data: request, error: requestError } = await admin.from("elite_media_requests")
      .select("id,status,subscription_status,trial_starts_at,trial_ends_at,user_id")
      .eq("id", requestId).eq("user_id", user.id).maybeSingle();
    if (requestError) throw requestError;
    if (!request || !["approved", "in_progress"].includes(request.status)) return reply({ ok: false, error: "approved_request_not_found" }, 403);
    const now = Date.now();
    const trialOk = request.subscription_status === "trial" && request.trial_starts_at && request.trial_ends_at &&
      Date.parse(request.trial_starts_at) <= now && Date.parse(request.trial_ends_at) > now;
    const paidOk = ["active", "paid", "subscribed"].includes(String(request.subscription_status || "").toLowerCase());
    if (!trialOk && !paidOk) return reply({ ok: false, error: "active_trial_or_subscription_required" }, 403);

    const resolution = String(form.get("resolution") || "320p") === "720p" ? "720p" : "320p";
    const topic = String(form.get("topic") || "").trim().slice(0, 500);
    const bucket = await admin.storage.getBucket(BUCKET);
    if (!bucket.data || bucket.data.public !== true || Number(bucket.data.fileSizeLimit || 0) < MAX_BYTES) {
      return reply({ ok: false, error: "elite_media_storage_bucket_not_ready" }, 503);
    }

    const { data: job, error: jobError } = await admin.from("elite_media_generation_jobs").insert({
      user_id: user.id,
      request_id: request.id,
      job_type: "video_render",
      status: "queued",
      input: { topic, output_format: "mp4", resolution, provider: "google_flow_consumer", source: "user_export" },
      output: { provider: "google_flow_consumer", provider_mode: "consumer_ui_export", source: "google_flow_export", ffmpeg_render_pending: false, qa_status: "pending" }
    }).select("id").single();
    if (jobError) throw jobError;

    const storagePath = `elite-media/${user.id}/${job.id}/final.mp4`;
    const upload = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: "video/mp4",
      cacheControl: "3600",
      upsert: false
    });
    if (upload.error) {
      await admin.from("elite_media_generation_jobs").update({
        status: "failed",
        output: { ingest_error: String(upload.error.message || "storage_upload_failed").slice(0, 200) },
        updated_at: new Date().toISOString()
      }).eq("id", job.id).eq("user_id", user.id);
      throw upload.error;
    }
    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
    const readback = await fetch(publicUrl, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(20000) });
    const contentType = (readback.headers.get("content-type") || "").toLowerCase();
    if (!readback.ok || !contentType.startsWith("video/")) {
      await admin.storage.from(BUCKET).remove([storagePath]);
      await admin.from("elite_media_generation_jobs").update({
        status: "failed",
        output: { ingest_error: "public_storage_readback_failed", readback_status: readback.status },
        updated_at: new Date().toISOString()
      }).eq("id", job.id).eq("user_id", user.id);
      return reply({ ok: false, error: "public_storage_readback_failed" }, 502);
    }

    const output = {
      provider: "google_flow_consumer",
      provider_mode: "consumer_ui_export",
      source: "google_flow_export",
      original_filename: file.name.slice(0, 180),
      byte_size: bytes.byteLength,
      sha256: await sha256(bytes),
      storage_path: storagePath,
      raw_output_url: publicUrl,
      ffmpeg_render_pending: true,
      ffmpeg_resolution: resolution,
      qa_status: "pending",
      ingested_at: new Date().toISOString()
    };
    const { error: updateError } = await admin.from("elite_media_generation_jobs").update({
      status: "rendering",
      source_url: publicUrl,
      output,
      updated_at: new Date().toISOString()
    }).eq("id", job.id).eq("user_id", user.id);
    if (updateError) throw updateError;

    return reply({
      ok: true,
      job_id: job.id,
      status: "rendering",
      provider: "google_flow_consumer",
      renderer: "GitHub Actions FFmpeg",
      resolution,
      bytes: bytes.byteLength,
      source_readback_verified: true,
      ffmpeg_queued: true
    }, 202);
  } catch (error) {
    console.error("elite-media-flow-ingest", error);
    return reply({ ok: false, error: "flow_export_ingestion_failed", detail: error instanceof Error ? error.message.slice(0, 240) : "unknown" }, 500);
  }
});
