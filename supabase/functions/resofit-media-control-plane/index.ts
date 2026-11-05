import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "https://elite.resofit.fit",
  "Access-Control-Allow-Headers": "authorization,content-type,x-resofit-control-key,x-content-cron-secret,x-buffer-cron-secret",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};
const out = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: cors });
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const publicBase = (Deno.env.get("R2_PUBLIC_BASE_URL") || "https://media.resofit.fit").replace(/\/$/, "");
const prefixes = new Set(["resofit","bigo","chatb2k","elite","bigo_highlights","buffer","imagekit","shop","public","content","products","campaigns","test","archive","private"]);

function valid(key: string) {
  if (!key || key.length > 900 || key.startsWith("/") || key.includes("\\") || /[\r\n\u0000-\u001f]/.test(key)) return false;
  const parts = key.split("/");
  return parts.length >= 2 && prefixes.has(parts[0]) && parts.every(part => !!part && part !== "." && part !== ".." && /^[A-Za-z0-9][A-Za-z0-9 ._@+=,-]*$/.test(part));
}
function isPrivateKey(key: string) {
  return ["archive/","private/","elite/raw/","bigo/raw/","bigo_highlights/raw/","resofit/raw/"].some(prefix => key.startsWith(prefix));
}
function same(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function jwtRole(token: string) {
  try {
    const p = token.split(".")[1];
    if (!p) return "";
    const b = p.replace(/-/g, "+").replace(/_/g, "/");
    return String(JSON.parse(atob(b.padEnd(Math.ceil(b.length / 4) * 4, "="))).role ?? "");
  } catch { return ""; }
}
async function writeToken() {
  if (!admin) throw new Error("supabase_service_role_unavailable");
  const { data, error } = await admin.rpc("chatb2k_get_runtime_secret", { p_name: "R2_WRITE_TOKEN" });
  if (error || typeof data !== "string" || !data.trim()) throw new Error("r2_write_token_unavailable");
  return data.trim();
}
async function workerHealth() {
  const response = await fetch(publicBase + "/health", { signal: AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => null);
  return { http_status: response.status, ...(body || {}) };
}
async function workerRequest(method: string, key: string, token: string, body?: Uint8Array, type = "application/octet-stream") {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const upload = method === "PUT";
  const url = upload ? "https://upload.resofit.fit/api/ingest-media?key=" + encodeURIComponent(key) : publicBase + "/" + encodedKey;
  const headers = new Headers({ Authorization: "Bearer " + token });
  if (upload) headers.set("Content-Type", type);
  return await fetch(url, {
    method: upload ? "POST" : method,
    headers,
    body: upload && body ? body : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
}
function decode64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function healthStatus() {
  try {
    const token = await writeToken();
    const worker = await workerHealth();
    const uploadResponse = await fetch("https://upload.resofit.fit/health", { signal: AbortSignal.timeout(15000) });
    const uploadWorker = await uploadResponse.json().catch(() => null);
    const ready = worker.http_status === 200 && worker.ok === true && worker.bucket_binding_ready === true &&
      uploadResponse.status === 200 && uploadWorker?.bucket_binding_ready === true;
    return { service: "resofit-media-control-plane", status: ready ? "READY" : "DEGRADED", storage_provider: "cloudflare_r2_worker", bucket: "resofit-cdn", public_base_url: publicBase, r2_write_token_configured: !!token, worker, upload_worker: { http_status: uploadResponse.status, ...(uploadWorker || {}) } };
  } catch (error) {
    return { service: "resofit-media-control-plane", status: "DEGRADED", storage_provider: "cloudflare_r2_worker", public_base_url: publicBase, detail: String(error).slice(0, 180) };
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method === "GET") {
    const health = await healthStatus();
    return out(health.status === "READY" ? 200 : 503, health);
  }
  if (request.method !== "POST") return out(405, { error: "method_not_allowed" });

  const expected = Deno.env.get("RESOFIT_MEDIA_CONTROL_SECRET") || "";
  const authorization = request.headers.get("authorization") || "";
  const provided = request.headers.get("x-resofit-control-key") || authorization.replace(/^Bearer\s+/i, "");
  const cronExpected = Deno.env.get("CONTENT_CRON_SECRET") || Deno.env.get("BUFFER_CRON_SECRET") || "";
  const cronProvided = request.headers.get("x-content-cron-secret") || request.headers.get("x-buffer-cron-secret") || "";
  const internalCronOk = same(cronExpected, cronProvided);
  if (!internalCronOk) {
    const bearer = authorization.replace(/^Bearer\s+/i, "");
    if (expected) {
      if (!same(expected, provided) && (!bearer || jwtRole(bearer) !== "service_role")) return out(401, { error: "unauthorized" });
    } else if (!bearer || jwtRole(bearer) !== "service_role") {
      return out(401, { error: "unauthorized" });
    }
  }

  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return out(400, { error: "invalid_json" }); }
  const action = String(payload.action || "");
  const key = String(payload.key || "");
  if (action === "health") return out(200, await healthStatus());
  if (action === "route") {
    const channel = String(payload.channel || "");
    const allowedChannels = ["resofit","bigo","chatb2k","elite","bigo_highlights","buffer","imagekit","shop"];
    if (!allowedChannels.includes(channel)) return out(400, { error: "invalid_channel", allowed: allowedChannels });
    if (!valid(key) || !key.startsWith(channel + "/")) return out(400, { error: "key_channel_mismatch" });
    if (isPrivateKey(key)) return out(403, { error: "private_media_has_no_public_route" });
    return out(200, { ok: true, channel, key, bucket: "resofit-cdn", storage_provider: "cloudflare_r2", public_url: publicBase + "/" + key.split("/").map(encodeURIComponent).join("/") });
  }
  if (!valid(key)) return out(400, { error: "invalid_object_key" });

  try {
    const token = await writeToken();
    if (action === "put") {
      if (typeof payload.body_base64 !== "string" || payload.body_base64.length > 18000000) return out(413, { error: "base64_body_required_or_too_large" });
      const bytes = decode64(payload.body_base64);
      const type = String(payload.content_type || "application/octet-stream").slice(0, 120);
      const response = await workerRequest("PUT", key, token, bytes, type);
      const result = await response.json().catch(() => null);
      if (!response.ok) return out(502, { error: "r2_worker_put_failed", upstream_status: response.status, detail: result?.error || null });
      return out(200, { ok: true, key, bytes: bytes.length, etag: result?.etag || null, storage_provider: "cloudflare_r2", public_url: isPrivateKey(key) ? null : result?.media_url || null });
    }
    if (action === "get") {
      const response = await workerRequest("GET", key, token);
      if (!response.ok) return out(response.status === 404 ? 404 : 502, { error: "r2_worker_get_failed", upstream_status: response.status });
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 12000000) return out(413, { error: "object_too_large_for_inline_response", bytes: bytes.length, public_url: isPrivateKey(key) ? null : publicBase + "/" + key.split("/").map(encodeURIComponent).join("/") });
      let binary = "";
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
      const sha256 = Array.from(digest, value => value.toString(16).padStart(2, "0")).join("");
      return out(200, { ok: true, key, bytes: bytes.length, content_type: response.headers.get("content-type"), body_base64: btoa(binary), sha256 });
    }
    if (action === "delete") {
      const response = await workerRequest("DELETE", key, token);
      const result = await response.json().catch(() => null);
      return response.ok ? out(200, { ok: true, key, deleted: true, storage_provider: "cloudflare_r2" }) : out(502, { error: "r2_worker_delete_failed", upstream_status: response.status, detail: result?.error || null });
    }
    return out(400, { error: "unknown_action", allowed: ["health","route","put","get","delete"] });
  } catch (error) {
    console.error("ResoFit R2 control-plane failure", error);
    return out(502, { error: "r2_worker_request_failed", detail: String(error).slice(0, 180) });
  }
});
