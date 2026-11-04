import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const offers = {
  "highlight-launch-pack": { usd: 49, billing: "one_time" },
  "creator-starter": { usd: 9, billing: "monthly_direct_checkout" },
  "creator-pro": { usd: 19, billing: "monthly_direct_checkout" },
  "agency-workspace": { usd: 99, billing: "monthly_request_only" },
  "agency-production-retainer": { usd: 300, billing: "monthly_quote_only" }
} as const;
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, OPTIONS" };
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("fx_provider_unavailable");
    const data = await response.json();
    const rate = Number(data?.rates?.NGN);
    const updatedAt = Number(data?.time_last_update_unix) * 1000;
    if (data?.result !== "success" || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(updatedAt) || Date.now() - updatedAt > 24 * 60 * 60 * 1000 || updatedAt > Date.now() + 5 * 60 * 1000) throw new Error("fx_quote_stale_or_invalid");
    const quotedAt = new Date().toISOString();
    const offersWithQuote = Object.entries(offers).map(([slug, offer]) => ({ slug, usd: offer.usd, billing: offer.billing, estimated_ngn: Math.round(offer.usd * rate), fx_rate_ngn_per_usd: rate, fx_source_updated_at: new Date(updatedAt).toISOString(), quoted_at: quotedAt }));
    return new Response(JSON.stringify({ currency: "NGN", base_currency: "USD", fx_rate_ngn_per_usd: rate, fx_source: "open.er-api.com", fx_source_updated_at: new Date(updatedAt).toISOString(), quoted_at: quotedAt, offers: offersWithQuote, disclaimer: "Indicative FX estimate only; the final NGN amount is recalculated at secure checkout. Agency scope and fees are confirmed in an agreed proposal." }), { status: 200, headers });
  } catch (error) {
    console.error("Elite FX quote unavailable", String(error));
    return new Response(JSON.stringify({ error: "fx_quote_unavailable", message: "Live NGN estimates are temporarily unavailable. USD list prices remain visible; no stale or hardcoded rate is used." }), { status: 503, headers });
  }
});