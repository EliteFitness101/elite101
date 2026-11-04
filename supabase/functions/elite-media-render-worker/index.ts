import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const BUCKET = "digital-product-media";
const cors = {
  "Access-Control-Allow-Origin": "https://elite.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
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
    if (action === "start") return reply({ ok: false, error: "server_side_video_generation_disabled_use_elite_media_flow_ingest" }, 409);
    const output = { ...(job.output || {}) };
    if (output.ffmpeg_render_pending === true) {
      return reply({ ok: true, job_id: job.id, status: "rendering", ffmpeg_queued: true }, 202);
    }

    if (action === "status") {
      return reply({ ok: true, job_id: job.id, status: job.status, output_url: job.output_url, output });
    }

    if (action === "start" || action === "poll") {
      return reply({
        ok: false,
        error: "server_side_gemini_video_generation_disabled",
        supported_mode: "google_flow_consumer_export",
        next_action: "upload_google_flow_export_to_elite_media_flow_ingest",
        billing: "No Gemini Developer API request was made."
      }, 409);
    }
    return reply({ ok: false, error: "unsupported_action", supported_actions: ["status"] }, 400);
  } catch (e) {
    console.error("elite-media-render-worker", e);
    return reply({ ok: false, error: "render_worker_failed" }, 500);
  }
});
