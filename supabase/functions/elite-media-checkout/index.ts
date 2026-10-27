import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const allowedOrigins = new Set(["https://elite.resofit.fit", "https://elite101.vercel.app"]);
const offers = {
  "highlight-launch-pack": { name: "Highlight Launch Pack", usd: 49, interval: "once" },
  "creator-starter": { name: "Starter", usd: 9, interval: "monthly" },
  "creator-pro": { name: "Pro", usd: 19, interval: "monthly" },
  "agency-workspace": { name: "Agency Workspace", usd: 99, interval: "monthly" },
  "agency-production-retainer": { name: "Agency Production", usd: 300, interval: "monthly" },
} as const;
const json = (status: number, body: unknown, origin: string) => new Response(JSON.stringify(body), {
  status, headers: {
    "Content-Type": "application/json", "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin, "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
});
async function paystack(path: string, method: string, body?: unknown) {
  const response = await fetch("https://api.paystack.co" + path, {
    method, headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status) throw new Error("paystack_api_rejected");
  return payload.data;
}
async function getNgnPerUsd() {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("fx_unavailable");
  const data = await response.json();
  const rate = Number(data?.rates?.NGN);
  const updated = Number(data?.time_last_update_unix);
  if (data?.result !== "success" || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(updated) ||
      Date.now() / 1000 - updated > 86400 || updated > Date.now() / 1000 + 300) throw new Error("fx_quote_stale");
  return { rate, updatedAt: new Date(updated * 1000).toISOString() };
}
Deno.serve(async (req: Request) => {
  const requestOrigin = (req.headers.get("origin") ?? "").replace(/\/$/, "");
  const origin = allowedOrigins.has(requestOrigin) ? requestOrigin : "https://elite.resofit.fit";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": origin, "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }});
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, origin);
  if (!PAYSTACK_SECRET_KEY.startsWith("sk_live_")) return json(503, { error: "live_checkout_not_configured" }, origin);
  try {
    const body = await req.json();
    const slug = String(body?.offer_slug ?? "");
    const offer = offers[slug as keyof typeof offers];
    if (!offer) return json(400, { error: "invalid_offer" }, origin);
    const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 255);
    const fullName = String(body?.name ?? "").trim().slice(0, 120);
    const phone = String(body?.phone ?? "").trim().slice(0, 32);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2 || phone.length < 7)
      return json(400, { error: "valid_email_name_and_phone_required" }, origin);
    let authUserId: string | null = null;
    const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer) {
      const { data: { user } } = await admin.auth.getUser(bearer);
      if (user) authUserId = user.id;
    }
    const fx = await getNgnPerUsd();
    const amountNgn = Math.round(offer.usd * fx.rate);
    const amountKobo = amountNgn * 100;
    const reference = `ELITE-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    let planCode: string | null = null;
    if (offer.interval === "monthly") {
      const planName = `ELITE:${slug}:${amountNgn}:monthly`;
      const plans = await paystack("/plan?perPage=100&interval=monthly", "GET");
      const existing = (Array.isArray(plans) ? plans : []).find((p: any) =>
        p?.name === planName && Number(p?.amount) === amountKobo && p?.interval === "monthly" && p?.currency === "NGN");
      if (existing?.plan_code) planCode = String(existing.plan_code);
      else {
        const created = await paystack("/plan", "POST", {
          name: planName, description: `Elite NG ${offer.name} monthly subscription`,
          amount: amountKobo, interval: "monthly", currency: "NGN",
          send_invoices: true, send_sms: false,
        });
        planCode = String(created?.plan_code ?? "");
        if (!planCode) throw new Error("paystack_plan_creation_failed");
      }
    }
    const metadata = {
      checkout_channel: "elite_media_paystack", sku: `ELITE-${slug.toUpperCase()}`,
      product_name: offer.name, offer_slug: slug, billing_interval: offer.interval,
      amount_usd_listed: offer.usd, amount_ngn: amountNgn, fx_rate_ngn_per_usd: fx.rate,
      fx_source_updated_at: fx.updatedAt, paystack_plan_code: planCode, auth_user_id: authUserId,
      customer_name: fullName, phone, canonical_origin: "https://elite.resofit.fit/monetization",
    };
    const { error: checkoutErr } = await admin.from("elite_media_checkouts").insert({
      reference, auth_user_id: authUserId, email, full_name: fullName, phone,
      offer_slug: slug, offer_name: offer.name, amount_ngn: amountNgn,
      billing_interval: offer.interval, paystack_plan_code: planCode, status: "pending", metadata,
    });
    if (checkoutErr) throw new Error("checkout_persistence_failed");
    const rsid = `ELITE-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
    const subscriberMetadata = { ...metadata, rsid, rsid_source: "elite_checkout" };
    const { error: subscriberErr } = await admin.from("resoflex_subscribers").insert({
      rsid, reference, email, full_name: fullName, phone, product_id: metadata.sku,
      product_name: offer.name, amount_paid: amountNgn, currency: "NGN",
      payment_status: "pending", user_id: authUserId, metadata: subscriberMetadata,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    if (subscriberErr) {
      await admin.from("elite_media_checkouts").update({ status: "failed", updated_at: new Date().toISOString() }).eq("reference", reference);
      throw new Error("checkout_order_persistence_failed");
    }
    const { error: paymentErr } = await admin.from("payments").insert({
      user_id: authUserId, amount: amountNgn, currency: "NGN", status: "pending",
      plan_type: offer.name, paystack_ref: reference, rsid, customer_email: email,
      product_sku: metadata.sku, funnel_origin: "elite_media", gross_amount: amountKobo,
      settlement_status: "pending", reconciled: false, metadata: subscriberMetadata,
    });
    if (paymentErr) throw new Error("payment_ledger_persistence_failed");
    const payBody: Record<string, unknown> = {
      email, amount: amountKobo, currency: "NGN", reference,
      callback_url: "https://elite.resofit.fit/checkout?payment=return",
      metadata: { ...subscriberMetadata, custom_fields: [
        { display_name: "Offer", variable_name: "offer", value: offer.name },
        { display_name: "Billing", variable_name: "billing_interval", value: offer.interval },
        { display_name: "RSID", variable_name: "rsid", value: rsid },
      ] },
      channels: offer.interval === "monthly" ? ["card"] : ["card", "bank", "ussd", "bank_transfer", "mobile_money"],
    };
    if (planCode) payBody.plan = planCode;
    const transaction = await paystack("/transaction/initialize", "POST", payBody);
    if (!transaction?.authorization_url) throw new Error("paystack_authorization_url_missing");
    await admin.from("elite_media_checkouts").update({ updated_at: new Date().toISOString() }).eq("reference", reference);
    return json(200, {
      ok: true, reference, authorization_url: transaction.authorization_url,
      offer: offer.name, billing_interval: offer.interval, amount_ngn: amountNgn,
      currency: "NGN", fx_rate_ngn_per_usd: fx.rate, fx_source_updated_at: fx.updatedAt,
    }, origin);
  } catch (error) {
    console.error("elite-media-checkout failed", String(error));
    return json(502, { error: error instanceof Error && error.message === "live_checkout_not_configured" ? error.message : "checkout_initialization_failed" }, origin);
  }
});