import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
let selectedOutputRoute = null;
let outputBucket = "";
if (!base || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY repository secrets");

async function api(route, init = {}) {
  const response = await fetch(base + route, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(90_000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
}

async function selectOutputRoute() {
  const routes = await api("/rest/v1/chatb2k_provider_routes?service_type=eq.media_storage&status=eq.active&select=route_id,provider,config");
  const candidates = (routes || [])
    .filter(route => route.config?.bucket && route.config?.supports_video === true &&
      route.config?.selection_policy?.public_only === true &&
      route.config?.selection_policy?.preferred_for?.includes("elite_generated_video"))
    .sort((a, b) => Number(a.config.priority || 999) - Number(b.config.priority || 999));
  for (const route of candidates) {
    const bucket = await api("/storage/v1/bucket/" + encodeURIComponent(route.config.bucket));
    if (bucket?.public === true && Number(bucket.file_size_limit || 0) >= 45 * 1024 * 1024) {
      return route;
    }
  }
  throw new Error("No active, public, video-capable ChatB2K storage route passed bucket metadata verification");
}
selectedOutputRoute = await selectOutputRoute();
outputBucket = selectedOutputRoute.config.bucket;
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-5000); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${command} failed: ${stderr.slice(-1200)}`)));
  });
}
async function probe(file) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v","error","-select_streams","v:0","-show_entries","stream=codec_name,width,height,pix_fmt","-of","json",file]);
    let out = "", err = "";
    child.stdout.on("data", d => out += d.toString());
    child.stderr.on("data", d => err += d.toString());
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(JSON.parse(out).streams?.[0]) : reject(new Error(err || "ffprobe failed")));
  });
}
async function processJob(job) {
  const entitlement = await api(`/rest/v1/elite_media_requests?id=eq.${encodeURIComponent(job.request_id)}&user_id=eq.${encodeURIComponent(job.user_id)}&select=id,status,subscription_status,trial_starts_at,trial_ends_at`);
  const request = entitlement?.[0];
  const now = Date.now();
  const trialOk = request?.subscription_status === "trial" && request.trial_starts_at && request.trial_ends_at &&
    Date.parse(request.trial_starts_at) <= now && Date.parse(request.trial_ends_at) > now;
  const paidOk = ["active","paid","subscribed"].includes(String(request?.subscription_status || "").toLowerCase());
  if (!request || !["approved","in_progress"].includes(request.status) || !(trialOk || paidOk)) {
    throw new Error("Active Elite trial/subscription not verified; refusing to render");
  }

  const sourcePath = job.output?.storage_path;
  const sourceBucket = job.output?.storage_bucket === "resofit-paid-deliverables" ? "resofit-paid-deliverables" : "digital-product-media";
  const originProvider = job.output?.provider || job.input?.provider || job.output?.source || (String(job.output?.source_provider || "").toLowerCase().includes("gemini") ? "gemini_api" : "unknown");
  const registryProvider = originProvider === "google_flow_consumer" || originProvider === "google_flow_export"
    ? "elite_google_flow_export_ffmpeg"
    : originProvider === "google_gemini_omni" || originProvider === "gemini_api"
      ? "elite_gemini_api_ffmpeg"
      : "elite_media_ffmpeg";
  const expectedPrefix = `elite-media/${job.user_id}/${job.id}/`;
  if (typeof sourcePath !== "string" || !sourcePath.startsWith(expectedPrefix) || sourcePath.includes("..") || !sourcePath.endsWith("/final.mp4")) {
    throw new Error("Source storage path does not match the owned Elite job");
  }
  const resolution = job.input?.resolution === "720p" ? "720p" : "320p";
  const aspectRatio = job.input?.aspect_ratio === "16:9" ? "16:9" : "9:16";
  const width = aspectRatio === "16:9" ? (resolution === "320p" ? 568 : 1280) : (resolution === "320p" ? 180 : 405);
  const height = resolution === "320p" ? 320 : 720;
  const download = await fetch(`${base}/storage/v1/object/authenticated/${sourceBucket}/${sourcePath.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(90_000),
  });
  if (!download.ok) throw new Error(`Raw MP4 download failed: HTTP ${download.status}`);
  const source = Buffer.from(await download.arrayBuffer());
  if (source.length < 12 || source.length > 45 * 1024 * 1024 || source.toString("ascii",4,8) !== "ftyp") {
    throw new Error("Raw MP4 failed size or file-signature validation");
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "elite-media-"));
  const input = path.join(dir, "source.mp4");
  const outputFile = path.join(dir, "final.mp4");
  try {
    await writeFile(input, source, { mode: 0o600 });
    await run("ffmpeg", [
      "-hide_banner","-loglevel","error","-y","-i",input,
      "-vf",`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=24,format=yuv420p`,
      "-c:v","libx264","-preset","veryfast","-b:v",resolution === "320p" ? "350k" : "1200k",
      "-maxrate",resolution === "320p" ? "450k" : "1500k","-bufsize",resolution === "320p" ? "700k" : "2400k",
      "-c:a","aac","-b:a",resolution === "320p" ? "64k" : "96k","-movflags","+faststart",outputFile,
    ]);
    const rendered = await readFile(outputFile);
    if (rendered.length < 1024 || rendered.toString("ascii",4,8) !== "ftyp") throw new Error("FFmpeg output MP4 signature invalid");
    const stream = await probe(outputFile);
    if (!stream || stream.codec_name !== "h264" || stream.width !== width || stream.height !== height || stream.pix_fmt !== "yuv420p") {
      throw new Error("ffprobe did not confirm the requested H.264 profile");
    }
    const digest = createHash("sha256").update(rendered).digest("hex");
    const targetPath = `elite-media/${job.user_id}/${job.id}/final-${resolution}.mp4`;
    const upload = await fetch(`${base}/storage/v1/object/${outputBucket}/${targetPath.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: { apikey:key, authorization:`Bearer ${key}`, "content-type":"video/mp4", "x-upsert":"true" },
      body: rendered,
      signal: AbortSignal.timeout(90_000),
    });
    if (!upload.ok) throw new Error(`Derivative upload failed: HTTP ${upload.status} ${(await upload.text()).slice(0,300)}`);
    const publicUrl = `${base}/storage/v1/object/public/${outputBucket}/${targetPath.split("/").map(encodeURIComponent).join("/")}`;
    const head = await fetch(publicUrl, { method:"HEAD", signal:AbortSignal.timeout(30_000) });
    if (!head.ok || !(head.headers.get("content-type") || "").toLowerCase().startsWith("video/")) {
      throw new Error("Public MP4 playback HEAD readback failed");
    }

    const registry = await api("/rest/v1/content_asset_registry?on_conflict=source_provider,source_asset_id", {
      method:"POST",
      headers:{ "content-type":"application/json", prefer:"resolution=merge-duplicates,return=representation" },
      body:JSON.stringify({
        source_provider:registryProvider,
        source_asset_id:`${job.id}:${resolution}:ffmpeg-actions-v1`,
        source_url:publicUrl, canonical_url:publicUrl, brand:job.output?.brand || "Elite NG", campaign:job.output?.campaign || "elite_media_generation",
        asset_type:"video", mime_type:"video/mp4", width, height, aspect_ratio:aspectRatio,
        visual_summary:job.output?.visual_summary || job.input?.topic || "Elite NG generated video asset",
        alt_text:job.output?.alt_text || job.input?.topic || "Elite NG generated video asset",
        rights_status:"unknown", commercial_status:"review_required",
        qa_status:"pending", qa_reason:"FFmpeg derivative; technical profile and public readback verified. Human/platform QA required before publication.",
        origin_review_status:"pending",
        content_origin:{ provider:originProvider, mode:job.output?.provider_mode || job.input?.source || "automated_generation", raw_storage_bucket:job.output?.storage_bucket ?? sourceBucket,
          raw_storage_path:job.output?.storage_path ?? sourcePath, raw_sha256:job.output?.sha256 ?? null,
          original_filename:job.output?.original_filename ?? null, ingested_at:job.output?.ingested_at ?? null },
        rights_evidence:{ status:"pending_review", provider:originProvider, raw_storage_bucket:job.output?.storage_bucket ?? sourceBucket,
          raw_storage_path:job.output?.storage_path ?? sourcePath, raw_sha256:job.output?.sha256 ?? null },
        content_pillar:"ELITE_MEDIA",
        intelligence:{ elite_job_id:job.id, site_slot:job.output?.site_slot || null, source_provider:originProvider, raw_storage_bucket:job.output?.storage_bucket ?? sourceBucket,
          raw_storage_path:job.output?.storage_path ?? sourcePath, resolution, aspect_ratio:aspectRatio, codec:stream.codec_name, pixel_format:stream.pix_fmt,
          byte_size:rendered.length, sha256:digest, renderer:"GitHub Actions FFmpeg" },
        verified_at:new Date().toISOString(), updated_at:new Date().toISOString()
      })
    });
    if (!registry?.[0]?.id) throw new Error("Asset registry upsert returned no asset ID");

    const routeConfig = {
      ...selectedOutputRoute.config,
      runtime_verified: true,
      health_state: "write_read_registry_verified",
      last_verified_at: new Date().toISOString(),
      last_verified_job_id: job.id,
      last_verified_asset_id: registry[0].id
    };
    await api("/rest/v1/chatb2k_provider_routes?route_id=eq." + encodeURIComponent(selectedOutputRoute.route_id), {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ config: routeConfig, updated_at: new Date().toISOString() })
    });
    const output = {
      ...(job.output || {}),
      raw_output_url:job.output?.raw_output_url ?? null,
      raw_storage_bucket:job.output?.storage_bucket ?? sourceBucket,
      raw_storage_path:job.output?.storage_path ?? sourcePath,
      output_url:publicUrl,
      storage_path:targetPath,
      asset_id:registry[0].id,
      renderer:"GitHub Actions FFmpeg",
      resolution,width,height,aspect_ratio:aspectRatio,codec:stream.codec_name,pixel_format:stream.pix_fmt,
      byte_size:rendered.length,sha256:digest,readback_verified:true,
      ffmpeg_render_pending:false,qa_status:"pending",transcoded_at:new Date().toISOString()
    };
    await api(`/rest/v1/elite_media_generation_jobs?id=eq.${encodeURIComponent(job.id)}`, {
      method:"PATCH",
      headers:{ "content-type":"application/json", prefer:"return=minimal" },
      body:JSON.stringify({ status:"ready", output_url:publicUrl, output, updated_at:new Date().toISOString() })
    });
    console.log(JSON.stringify({ job_id:job.id, asset_id:registry[0].id, output_url:publicUrl, resolution, width, height, byte_size:rendered.length, sha256:digest, readback_verified:true }));
  } finally {
    await rm(dir,{recursive:true,force:true});
  }
}

const filter = process.env.INPUT_JOB_ID
  ? `id=eq.${encodeURIComponent(process.env.INPUT_JOB_ID)}&`
  : "";
const jobs = await api(`/rest/v1/elite_media_generation_jobs?${filter}status=eq.rendering&job_type=eq.video_render&output->>ffmpeg_render_pending=eq.true&select=id,user_id,request_id,status,input,output,output_url&order=created_at.asc&limit=3`);
console.log(`Elite FFmpeg queue: ${jobs.length} pending job(s)`);
for (const job of jobs) {
  try { await processJob(job); }
  catch (error) {
    console.error(JSON.stringify({job_id:job.id,error:String(error).slice(0,500)}));
    const output = {...(job.output||{}),ffmpeg_render_error:String(error).slice(0,500),ffmpeg_last_attempt_at:new Date().toISOString()};
    await api(`/rest/v1/elite_media_generation_jobs?id=eq.${encodeURIComponent(job.id)}`,{
      method:"PATCH",headers:{"content-type":"application/json",prefer:"return=minimal"},
      body:JSON.stringify({output,updated_at:new Date().toISOString()})
    });
    process.exitCode = 1;
  }
}
