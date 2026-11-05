const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const secondaryGeminiKey = process.env.GEMINI_AUTOMATION_API_KEY || process.env.GEMINI_API_KEY1 || "";
console.log("Secondary Gemini provider key configured:", Boolean(secondaryGeminiKey), "source:", process.env.GEMINI_AUTOMATION_API_KEY ? "GEMINI_AUTOMATION_API_KEY" : process.env.GEMINI_API_KEY1 ? "GEMINI_API_KEY1" : "none");
if (!base || !key) throw new Error("Missing Supabase runner credentials");

async function request(path, init = {}) {
  const response = await fetch(base + path, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(90000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : null;
}

const smokeJobs = await request("/rest/v1/elite_media_generation_jobs?job_type=eq.video_render&select=output&order=updated_at.desc&limit=20");
const workerSecondaryKeyAvailable = (smokeJobs || []).some(job =>
  job.output?.source_upload_smoke_verified === true && job.output?.secondary_provider_key_available === true
);
const secondaryKeyAvailable = Boolean(secondaryGeminiKey || workerSecondaryKeyAvailable);
console.log("Secondary Gemini provider key available inside worker:", workerSecondaryKeyAvailable);
const queuedJobs = await request("/rest/v1/elite_media_generation_jobs?status=eq.queued&job_type=eq.video_render&select=id,user_id,input,output&order=created_at.asc&limit=30");
const now = Date.now();
const startable = (queuedJobs || []).filter(job => {
  const retryAt = Date.parse(job.output?.next_retry_at || "");
  const due = !job.output?.next_retry_at || Number.isNaN(retryAt) || retryAt <= now;
  const attempts = Number(job.output?.provider_attempts || 0);
  return job.user_id && job.input?.start_automatically === true && due && attempts < 3 && (secondaryKeyAvailable || job.input?.source_upload_only === true);
}).slice(0, 3);
const automationHeader = secondaryGeminiKey ? { "x-gemini-automation-key": secondaryGeminiKey } : {};
console.log(`Gemini Omni start queue: ${startable.length} eligible job(s)`);
for (const job of startable) {
  try {
    const response = await fetch(`${base}/functions/v1/elite-media-render-worker`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...automationHeader },
      body: JSON.stringify({ action: "start", job_id: job.id, user_id: job.user_id }),
      signal: AbortSignal.timeout(90000),
    });
    const body = await response.text();
    let result = null;
    try { result = JSON.parse(body); } catch {}
    if (!response.ok) {
      console.error(JSON.stringify({ job_id: job.id, start_status: response.status, error: result?.error || body.slice(0, 300) }));
      continue;
    }
    console.log(JSON.stringify({ job_id: job.id, start: result?.status || "submitted", interaction_submitted: result?.interaction_submitted || false, provider_key_slot: result?.provider_key_slot || "primary", secondary_key_available: result?.secondary_provider_key_available ?? secondaryKeyAvailable }));
  } catch (error) {
    console.error(JSON.stringify({ job_id: job.id, start_error: String(error).slice(0, 300) }));
  }
}

const jobs = await request("/rest/v1/elite_media_generation_jobs?status=eq.rendering&job_type=eq.video_render&select=id,user_id,output&order=created_at.asc&limit=30");
const pending = (jobs || []).filter(job =>
  job.user_id &&
  job.output?.provider_interaction_id &&
  job.output?.ffmpeg_render_pending !== true
).slice(0, 8);

console.log(`Gemini Omni poll queue: ${pending.length} eligible job(s)`);
for (const job of pending) {
  try {
    const response = await fetch(`${base}/functions/v1/elite-media-render-worker`, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        ...automationHeader,
      },
      body: JSON.stringify({ action: "poll", job_id: job.id, user_id: job.user_id }),
      signal: AbortSignal.timeout(90000),
    });
    const body = await response.text();
    let result = null;
    try { result = JSON.parse(body); } catch {}
    if (!response.ok) {
      console.error(JSON.stringify({ job_id: job.id, poll_status: response.status, error: result?.error || body.slice(0, 300) }));
      continue;
    }
    console.log(JSON.stringify({ job_id: job.id, status: result?.status || result?.worker?.status || "polled", ffmpeg_queued: result?.ffmpeg_queued || false }));
  } catch (error) {
    console.error(JSON.stringify({ job_id: job.id, error: String(error).slice(0, 300) }));
  }
}
