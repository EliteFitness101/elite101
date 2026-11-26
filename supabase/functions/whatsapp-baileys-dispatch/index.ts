import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const secret = async (name: string) => {
  const { data, error } = await db.rpc("get_social_secret", { p_name: name });
  if (error) throw new Error("vault_secret_lookup_failed:" + name);
  return data ? String(data) : "";
};
const equal = async (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  const e = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", e.encode(a)), crypto.subtle.digest("SHA-256", e.encode(b))]);
  const A = new Uint8Array(x), B = new Uint8Array(y); let d = 0;
  for (let i = 0; i < A.length; i++) d |= A[i] ^ B[i];
  return d === 0;
};
const isAuthorizedCron = async (req: Request) => {
  const expected = await secret("buffer_cron_secret");
  return await equal(req.headers.get("x-whatsapp-baileys-cron-secret") || "", expected);
};
const isAuthorizedWorker = async (req: Request) => {
  const expected = await secret("whatsapp_baileys_api_key");
  return await equal(req.headers.get("x-baileys-worker-secret") || "", expected);
};
const isSelfReference = (endpoint: string) => {
  try {
    const candidate = new URL(endpoint);
    const current = new URL(SUPABASE_URL + "/functions/v1/whatsapp-baileys-dispatch");
    return candidate.origin === current.origin &&
      candidate.pathname.replace(/\/+$/, "") === current.pathname.replace(/\/+$/, "");
  } catch { return false; }
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "POST_required" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const action = String(body.action || "dispatch");
  try {
    if (action === "health") {
      if (!(await isAuthorizedCron(req)) && !(await isAuthorizedWorker(req))) return json({ ok: false, error: "unauthorized" }, 401);
      const endpoint = await secret("whatsapp_baileys_endpoint");
      const apiKey = await secret("whatsapp_baileys_api_key");
      const endpointIsSelfReference = isSelfReference(endpoint);
      const { count: activeDestinations } = await db.from("social_destinations").select("id", { count: "exact", head: true }).eq("provider", "whatsapp").eq("active", true);
      return json({ ok: true, service: "whatsapp-baileys-dispatch", mode: "adapter", worker_endpoint_configured: Boolean(endpoint) && !endpointIsSelfReference, worker_endpoint_self_reference: endpointIsSelfReference, worker_key_configured: Boolean(apiKey), active_whatsapp_destinations: activeDestinations ?? 0, note: "This Supabase adapter does not host the persistent Baileys session." });
    }

    if (action === "ack") {
      if (!(await isAuthorizedWorker(req))) return json({ ok: false, error: "unauthorized_worker" }, 401);
      const queueId = String(body.queue_id || "");
      const destinationId = String(body.destination_id || "");
      const status = String(body.status || "");
      const messageId = body.message_id == null ? null : String(body.message_id);
      const idem = String(body.idempotency_key || "");
      if (!queueId || !destinationId || !idem || !["published", "failed", "submitted"].includes(status)) return json({ ok: false, error: "invalid_ack_payload" }, 400);
      const patch: Record<string, unknown> = { status, attempt_count: 1, response_metadata: { worker_ack: true, acknowledged_at: new Date().toISOString(), message_id: messageId } };
      if (messageId) patch.external_post_id = messageId;
      if (status === "failed") patch.last_error = String(body.error || "Baileys worker reported failure").slice(0, 1000);
      const { error } = await db.from("social_publish_attempts").upsert({ queue_id: queueId, provider: "whatsapp", platform: String(body.platform || "whatsapp"), destination_id: destinationId, idempotency_key: idem, ...patch }, { onConflict: "idempotency_key" });
      if (error) throw error;
      if (status === "published") {
        await db.from("content_publish_log").insert({ queue_id: queueId, platform: String(body.platform || "whatsapp"), provider: "baileys", provider_post_id: messageId, status: "published", published_at: new Date().toISOString(), channel_id: String(body.destination || destinationId), metrics: { destination_id: destinationId, idempotency_key: idem, worker_ack: true } });
      }
      return json({ ok: true, recorded: status, queue_id: queueId });
    }

    if (!(await isAuthorizedCron(req))) return json({ ok: false, error: "unauthorized_cron" }, 401);
    const endpoint = await secret("whatsapp_baileys_endpoint");
    const workerKey = await secret("whatsapp_baileys_api_key");
    if (!endpoint || !workerKey) return json({ ok: false, status: "not_configured", missing: [!endpoint ? "whatsapp_baileys_endpoint" : null, !workerKey ? "whatsapp_baileys_api_key" : null].filter(Boolean), note: "No messages sent; configure the persistent Baileys worker endpoint and key in Supabase Vault." }, 503);
    if (isSelfReference(endpoint)) return json({ ok: false, status: "not_configured", error: "worker_endpoint_self_reference", note: "The configured endpoint points back to this adapter, not to a persistent Baileys worker. No messages were sent." }, 503);
    let parsed: URL;
    try { parsed = new URL(endpoint); } catch { return json({ ok: false, error: "invalid_worker_endpoint_url" }, 503); }
    if (parsed.protocol !== "https:") return json({ ok: false, error: "worker_endpoint_must_use_https" }, 503);

    const { data: destinations, error: destErr } = await db.from("social_destinations").select("id,provider,platform,external_channel_id,display_name,active,capabilities,metadata").eq("provider", "whatsapp").eq("active", true);
    if (destErr) throw destErr;
    if (!destinations?.length) return json({ ok: true, dispatched: 0, reason: "no_active_whatsapp_destinations" });

    const { data: items, error: itemErr } = await db.from("content_queue").select("id,sku,title,asset_url,caption,platform,platforms,scheduled_at,metadata,safety_checked,status").in("platform", ["whatsapp", "whatsapp_channel", "whatsapp_status"]).in("status", ["approved", "scheduled"]).eq("safety_checked", true).or("scheduled_at.is.null,scheduled_at.lte." + new Date().toISOString()).order("scheduled_at", { ascending: true, nullsFirst: true }).limit(10);
    if (itemErr) throw itemErr;
    if (!items?.length) return json({ ok: true, dispatched: 0, reason: "no_due_approved_safety_checked_items" });

    const results: unknown[] = [];
    for (const item of items) {
      for (const dest of destinations) {
        const targetType = String(dest.platform || "");
        if (item.platform === "whatsapp_channel" && targetType !== "whatsapp_channel") continue;
        if (item.platform === "whatsapp_status" && targetType !== "whatsapp_status") continue;
        if (item.platform === "whatsapp" && !["whatsapp_channel", "whatsapp_status", "whatsapp_group"].includes(targetType)) continue;
        const idem = "baileys:" + item.id + ":" + dest.id;
        const { data: prior } = await db.from("social_publish_attempts").select("status").eq("idempotency_key", idem).maybeSingle();
        if (prior && ["published", "submitted", "queued"].includes(String(prior.status))) continue;
        const job = {
          action: "publish",
          queue_id: item.id,
          destination_id: dest.id,
          idempotency_key: idem,
          platform: targetType,
          destination: dest.external_channel_id,
          destination_name: dest.display_name,
          destination_metadata: dest.metadata || {},
          content: { title: item.title, caption: item.caption, asset_url: item.asset_url, sku: item.sku, metadata: item.metadata || {} },
          callback_url: SUPABASE_URL + "/functions/v1/whatsapp-baileys-dispatch",
          callback_action: "ack"
        };
        await db.from("social_publish_attempts").upsert({ queue_id: item.id, provider: "whatsapp", platform: targetType, destination_id: dest.id, idempotency_key: idem, status: "queued", attempt_count: 0, response_metadata: { adapter: "whatsapp-baileys-dispatch" } }, { onConflict: "idempotency_key" });
        try {
          const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "x-baileys-worker-secret": workerKey, "idempotency-key": idem }, body: JSON.stringify(job), signal: AbortSignal.timeout(15000) });
          const raw = await r.text(); let out: Record<string, unknown> = {};
          try { out = JSON.parse(raw); } catch { out = { response_excerpt: raw.slice(0, 300) }; }
          if (!r.ok) throw new Error("worker_http_" + r.status);
          const state = String(out.status || (out.accepted === true ? "submitted" : "unknown"));
          if (state === "published" && out.message_id) {
            await db.from("social_publish_attempts").upsert({ queue_id: item.id, provider: "whatsapp", platform: targetType, destination_id: dest.id, idempotency_key: idem, status: "published", attempt_count: 1, external_post_id: String(out.message_id), response_metadata: { worker_response: out } }, { onConflict: "idempotency_key" });
            await db.from("content_publish_log").insert({ queue_id: item.id, platform: targetType, provider: "baileys", provider_post_id: String(out.message_id), status: "published", published_at: new Date().toISOString(), channel_id: dest.external_channel_id, metrics: { destination_id: dest.id, idempotency_key: idem } });
          } else if (state === "submitted" || state === "queued") {
            await db.from("social_publish_attempts").upsert({ queue_id: item.id, provider: "whatsapp", platform: targetType, destination_id: dest.id, idempotency_key: idem, status: "submitted", attempt_count: 1, response_metadata: { worker_response: out } }, { onConflict: "idempotency_key" });
          } else throw new Error("worker_response_not_confirmed");
          results.push({ queue_id: item.id, destination: dest.display_name, status: state });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          await db.from("social_publish_attempts").upsert({ queue_id: item.id, provider: "whatsapp", platform: targetType, destination_id: dest.id, idempotency_key: idem, status: "failed", attempt_count: 1, last_error: message.slice(0, 1000), response_metadata: { adapter: "whatsapp-baileys-dispatch" } }, { onConflict: "idempotency_key" });
          results.push({ queue_id: item.id, destination: dest.display_name, status: "failed", error: message });
        }
      }
    }
    return json({ ok: true, dispatched: results.length, results });
  } catch (e) {
    console.error("whatsapp-baileys-dispatch", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "internal_error" }, 500);
  }
});