import http from "node:http";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PORT || 8080);
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RENDER_SECRET = process.env.ELITE_RENDER_SHARED_SECRET || "";
const BUCKET = "digital-product-media";
const MAX_SOURCE_BYTES = 45 * 1024 * 1024;

function send(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(payload));
}
function safePath(value) {
  return typeof value === "string" && value.length < 500 &&
    !value.startsWith("/") && !value.includes("..") && /^[a-zA-Z0-9_./-]+$/.test(value);
}
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new Error("request_body_too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
async function supabase(pathname, init = {}) {
  const response = await fetch(`${SUPABASE_URL}${pathname}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  return response;
}
async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-4000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command}_failed:${stderr.slice(-1200)}`)));
  });
}
async function render(jobId, resolution) {
  if (!SUPABASE_URL || !SERVICE_KEY || !RENDER_SECRET) throw new Error("renderer_environment_incomplete");
  const jobResponse = await supabase(`/rest/v1/elite_media_generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,user_id,request_id,status,job_type,input,output,output_url`);
  if (!jobResponse.ok) throw new Error("job_lookup_failed");
  const jobs = await jobResponse.json();
  const job = jobs[0];
  if (!job || job.job_type !== "video_render") throw new Error("video_render_job_not_found");
  const requestResponse = await supabase(`/rest/v1/elite_media_requests?id=eq.${encodeURIComponent(job.request_id)}&user_id=eq.${encodeURIComponent(job.user_id)}&select=id,status,subscription_status,trial_starts_at,trial_ends_at`);
  if (!requestResponse.ok) throw new Error("entitlement_lookup_failed");
  const requests = await requestResponse.json();
  const entitlement = requests[0];
  const now = Date.now();
  const entitled = entitlement &&
    ["approved", "in_progress"].includes(entitlement.status) &&
    ((entitlement.subscription_status === "trial" &&
      entitlement.trial_starts_at && entitlement.trial_ends_at &&
      Date.parse(entitlement.trial_starts_at) <= now && Date.parse(entitlement.trial_ends_at) > now) ||
      ["active", "paid", "subscribed"].includes(String(entitlement.subscription_status || "").toLowerCase()));
  if (!entitled) throw new Error("active_entitlement_required");

  const sourcePath = `elite-media/${job.user_id}/${job.id}/source.mp4`;
  const targetPath = `elite-media/${job.user_id}/${job.id}/final-${resolution}.mp4`;
  if (!safePath(sourcePath) || !safePath(targetPath)) throw new Error("storage_path_invalid");
  const sourceResponse = await supabase(`/storage/v1/object/authenticated/${BUCKET}/${sourcePath.split("/").map(encodeURIComponent).join("/")}`);
  if (!sourceResponse.ok) throw new Error(`source_download_failed_http_${sourceResponse.status}`);
  const source = Buffer.from(await sourceResponse.arrayBuffer());
  if (source.length < 12 || source.length > MAX_SOURCE_BYTES) throw new Error("source_video_size_invalid");
  if (source.toString("ascii", 4, 8) !== "ftyp") throw new Error("source_mp4_magic_bytes_invalid");

  const height = resolution === "320p" ? 320 : 720;
  const width = resolution === "320p" ? 180 : 404;
  const work = await mkdtemp(path.join(os.tmpdir(), "elite-render-"));
  const input = path.join(work, "source.mp4");
  const output = path.join(work, "final.mp4");
  try {
    await writeFile(input, source, { mode: 0o600 });
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", input,
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=24,format=yuv420p`,
      "-c:v", "libx264", "-preset", "veryfast", "-b:v", resolution === "320p" ? "350k" : "1200k",
      "-maxrate", resolution === "320p" ? "450k" : "1500k", "-bufsize", resolution === "320p" ? "700k" : "2400k",
      "-c:a", "aac", "-b:a", resolution === "320p" ? "64k" : "96k", "-movflags", "+faststart", output,
    ]);
    const rendered = await readFile(output);
    if (rendered.length < 1024 || rendered.toString("ascii", 4, 8) !== "ftyp") throw new Error("rendered_mp4_validation_failed");
    const probe = await new Promise((resolve, reject) => {
      const child = spawn("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt", "-of", "json", output]);
      let out = ""; let err = "";
      child.stdout.on("data", d => out += d.toString());
      child.stderr.on("data", d => err += d.toString());
      child.on("error", reject);
      child.on("close", code => code === 0 ? resolve(JSON.parse(out)) : reject(new Error(err || "ffprobe_failed")));
    });
    const stream = probe.streams?.[0];
    if (!stream || stream.codec_name !== "h264" || stream.width !== width || stream.height !== height || stream.pix_fmt !== "yuv420p") {
      throw new Error("ffprobe_output_profile_mismatch");
    }
    const digest = createHash("sha256").update(rendered).digest("hex");
    const upload = await supabase(`/storage/v1/object/${BUCKET}/${targetPath.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: { "content-type": "video/mp4", "x-upsert": "true" },
      body: rendered,
    });
    if (!upload.ok) throw new Error(`storage_upload_failed_http_${upload.status}`);
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${targetPath.split("/").map(encodeURIComponent).join("/")}`;
    const verify = await fetch(publicUrl, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(30_000) });
    if (!verify.ok || !(verify.headers.get("content-type") || "").toLowerCase().startsWith("video/")) {
      throw new Error("stored_mp4_readback_failed");
    }
    return { ok: true, job_id: jobId, bucket: BUCKET, storage_path: targetPath, output_url: publicUrl,
      resolution, width, height, codec: stream.codec_name, pixel_format: stream.pix_fmt,
      byte_size: rendered.length, sha256: digest, readback_verified: true };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") return send(res, 200, { ok: true, service: "elite-media-ffmpeg-renderer", ffmpeg: true });
  if (req.method !== "POST" || req.url !== "/render") return send(res, 404, { ok: false, error: "not_found" });
  if (!RENDER_SECRET || req.headers.authorization !== `Bearer ${RENDER_SECRET}`) return send(res, 401, { ok: false, error: "unauthorized" });
  try {
    const body = await readJson(req);
    const jobId = String(body.job_id || "");
    const resolution = body.resolution === "720p" ? "720p" : body.resolution === "320p" || !body.resolution ? "320p" : "";
    if (!/^[0-9a-f-]{36}$/i.test(jobId) || !resolution) return send(res, 400, { ok: false, error: "invalid_render_request" });
    return send(res, 200, await render(jobId, resolution));
  } catch (error) {
    const message = error instanceof Error ? error.message : "renderer_failed";
    console.error(JSON.stringify({ event: "render_failed", error: message, request_id: randomUUID() }));
    return send(res, 500, { ok: false, error: message.slice(0, 240) });
  }
});
server.listen(PORT, "0.0.0.0");
