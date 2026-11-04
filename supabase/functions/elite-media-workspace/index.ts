import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const allowedIntents = new Set([
  "elite-media-free-trial",
  "elite-highlight-launch-pack",
  "elite-creator-starter",
  "elite-creator-pro",
  "elite-agency-workspace",
  "elite-agency-production-retainer",
]);
const allowedPlatforms = new Set(["TikTok", "Instagram", "YouTube", "Facebook", "Google Business Profile", "BIGO Live", "Other"]);
const cors = {
  "Access-Control-Allow-Origin": "https://elite.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
async function findPaidCheckout(userId: string, email: string, intent: string) {
  if (!intent.startsWith("elite-") || intent === "elite-media-free-trial") return null;
  const offerSlug = intent.slice("elite-".length);
  const byUser = await admin.from("elite_media_checkouts")
    .select("reference,offer_slug,status").eq("auth_user_id", userId).eq("offer_slug", offerSlug)
    .in("status", ["paid", "active"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (byUser.error) throw byUser.error;
  if (byUser.data) return byUser.data;
  const byEmail = await admin.from("elite_media_checkouts")
    .select("reference,offer_slug,status").eq("email", email).eq("offer_slug", offerSlug)
    .in("status", ["paid", "active"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (byEmail.error) throw byEmail.error;
  return byEmail.data;
}

const validHttpsUrl = (v: string) => {
  if (!v) return true;
  try { return new URL(v).protocol === "https:"; } catch { return false; }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return reply({ ok: false, error: "authentication_required" }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user || !user.email || !user.email_confirmed_at) {
      return reply({ ok: false, error: "verified_account_required" }, 401);
    }
    if (req.method === "GET") {
      const { data, error } = await admin.from("elite_media_requests")
        .select("id,user_id,email,display_name,intent,status,created_at,updated_at,trial_starts_at,trial_ends_at,admin_notes,business_name,phone,country,timezone,website_url,creator_handle,target_platforms,goals,content_source_url,preferred_contact,service_terms_accepted_at,privacy_consent_at,media_rights_confirmed_at,onboarding_completed_at,subscription_status,subscription_plan,billing_reference")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return reply({ ok: true, requests: data ?? [] });
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return reply({ ok: false, error: "invalid_json" }, 400); }
    const requestId = clean(body.request_id, 64);
    const intent = clean(body.intent, 80);
    if (!requestId && !allowedIntents.has(intent)) return reply({ ok: false, error: "valid_request_required" }, 400);

    const businessName = clean(body.business_name, 120);
    const phone = clean(body.phone, 32);
    const country = clean(body.country, 80);
    const timezone = clean(body.timezone, 80);
    const websiteUrl = clean(body.website_url, 500);
    const creatorHandle = clean(body.creator_handle, 120);
    const goals = clean(body.goals, 3000);
    const contentSourceUrl = clean(body.content_source_url, 1000);
    const preferredContact = clean(body.preferred_contact, 40);
    const platforms = Array.isArray(body.target_platforms)
      ? body.target_platforms.filter((p): p is string => typeof p === "string" && allowedPlatforms.has(p)).slice(0, 7)
      : [];
    if (websiteUrl && !validHttpsUrl(websiteUrl)) return reply({ ok: false, error: "website_must_use_https" }, 400);
    if (contentSourceUrl && !validHttpsUrl(contentSourceUrl)) return reply({ ok: false, error: "media_link_must_use_https" }, 400);
    if (!businessName || !country || !goals || platforms.length === 0) {
      return reply({ ok: false, error: "business_country_goals_and_platforms_required" }, 400);
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      business_name: businessName || null,
      phone: phone || null,
      country,
      timezone: timezone || null,
      website_url: websiteUrl || null,
      creator_handle: creatorHandle || null,
      target_platforms: platforms,
      goals,
      content_source_url: contentSourceUrl || null,
      preferred_contact: preferredContact || null,
      updated_at: now,
    };

    const termsAccepted = body.service_terms_accepted === true;
    const privacyAccepted = body.privacy_consent === true;
    const mediaRightsConfirmed = body.media_rights_confirmed === true;
    if (requestId) {
      const { data: existing, error: lookupError } = await admin.from("elite_media_requests")
        .select("id,intent,service_terms_accepted_at,privacy_consent_at,media_rights_confirmed_at")
        .eq("id", requestId).eq("user_id", user.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return reply({ ok: false, error: "request_not_found" }, 404);
      if (!existing.service_terms_accepted_at && !termsAccepted) return reply({ ok: false, error: "service_terms_consent_required" }, 400);
      if (!existing.privacy_consent_at && !privacyAccepted) return reply({ ok: false, error: "privacy_consent_required" }, 400);
      if (!existing.media_rights_confirmed_at && !mediaRightsConfirmed) return reply({ ok: false, error: "media_rights_confirmation_required" }, 400);
      patch.service_terms_accepted_at = existing.service_terms_accepted_at ?? now;
      patch.privacy_consent_at = existing.privacy_consent_at ?? now;
      patch.media_rights_confirmed_at = existing.media_rights_confirmed_at ?? now;
      patch.onboarding_completed_at = now;
      const paidCheckout = await findPaidCheckout(user.id, user.email, existing.intent);
      if (paidCheckout) { patch.subscription_status = "active"; patch.subscription_plan = paidCheckout.offer_slug; patch.billing_reference = paidCheckout.reference; }
      const { data, error } = await admin.from("elite_media_requests").update(patch)
        .eq("id", requestId).eq("user_id", user.id)
        .select("id,intent,status,updated_at,onboarding_completed_at,service_terms_accepted_at,privacy_consent_at,media_rights_confirmed_at")
        .single();
      if (error) throw error;
      return reply({ ok: true, request: data });
    }

    if (!termsAccepted || !privacyAccepted || !mediaRightsConfirmed) {
      return reply({ ok: false, error: "all_required_consents_must_be_checked" }, 400);
    }
    const { data: existing, error: lookupError } = await admin.from("elite_media_requests")
      .select("id,intent,service_terms_accepted_at,privacy_consent_at,media_rights_confirmed_at")
      .eq("user_id", user.id).eq("intent", intent).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      if (!existing.service_terms_accepted_at) patch.service_terms_accepted_at = now;
      if (!existing.privacy_consent_at) patch.privacy_consent_at = now;
      if (!existing.media_rights_confirmed_at) patch.media_rights_confirmed_at = now;
      patch.onboarding_completed_at = now;
      const paidCheckout = await findPaidCheckout(user.id, user.email, intent);
      if (paidCheckout) { patch.subscription_status = "active"; patch.subscription_plan = paidCheckout.offer_slug; patch.billing_reference = paidCheckout.reference; }
      const { data, error } = await admin.from("elite_media_requests").update(patch)
        .eq("id", existing.id).eq("user_id", user.id)
        .select("id,intent,status,updated_at,onboarding_completed_at")
        .single();
      if (error) throw error;
      return reply({ ok: true, request: data });
    }
    const paidCheckout = await findPaidCheckout(user.id, user.email, intent);
    const metadata = user.user_metadata ?? {};
    const { data, error } = await admin.from("elite_media_requests").insert({
      user_id: user.id,
      email: user.email.trim().toLowerCase(),
      display_name: clean(metadata.display_name ?? metadata.full_name, 80) || null,
      intent,
      source: "elite.resofit.fit",
      ...patch,
      service_terms_accepted_at: now,
      privacy_consent_at: now,
      media_rights_confirmed_at: now,
      onboarding_completed_at: now,
      ...(paidCheckout ? { subscription_status: "active", subscription_plan: paidCheckout.offer_slug, billing_reference: paidCheckout.reference } : {}),
    }).select("id,intent,status,updated_at,onboarding_completed_at,subscription_status,subscription_plan,billing_reference").single();
    if (error) throw error;
    return reply({ ok: true, request: data });
  } catch (error) {
    console.error("elite-media-workspace failed", error);
    return reply({ ok: false, error: "workspace_request_failed" }, 500);
  }
});
