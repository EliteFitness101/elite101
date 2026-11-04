import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const allowedIntents = new Set([
  "elite-media-free-trial",
  "elite-highlight-launch-pack",
  "elite-creator-starter",
  "elite-creator-pro",
  "elite-agency-workspace",
  "elite-agency-production-retainer",
]);
const cors = {
  "Access-Control-Allow-Origin": "https://elite.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return reply({ ok: false, error: "authentication_required" }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user || !user.email) return reply({ ok: false, error: "valid_verified_account_required" }, 401);
    if (!user.email_confirmed_at) return reply({ ok: false, error: "email_verification_required" }, 403);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return reply({ ok: false, error: "invalid_json" }, 400); }
    const intent = typeof body.intent === "string" ? body.intent : "";
    if (!allowedIntents.has(intent)) return reply({ ok: false, error: "unsupported_offer_intent" }, 400);

    const metadata = user.user_metadata ?? {};
    const displayName = String(metadata.display_name ?? metadata.full_name ?? "").trim().slice(0, 80) || null;
    const email = user.email.trim().toLowerCase();

    const { data: existing, error: lookupError } = await admin
      .from("elite_media_requests")
      .select("id,intent,status,created_at")
      .eq("user_id", user.id)
      .eq("intent", intent)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return reply({ ok: true, already_exists: true, request: existing });

    const { data: requestRow, error: insertError } = await admin
      .from("elite_media_requests")
      .insert({
        user_id: user.id,
        email,
        display_name: displayName,
        intent,
        source: "elite.resofit.fit",
        metadata: {
          role: String(metadata.app_role ?? "").slice(0, 20) || null,
          user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
        },
      })
      .select("id,intent,status,created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: raced, error: raceError } = await admin
          .from("elite_media_requests")
          .select("id,intent,status,created_at")
          .eq("user_id", user.id)
          .eq("intent", intent)
          .single();
        if (raceError) throw raceError;
        return reply({ ok: true, already_exists: true, request: raced });
      }
      throw insertError;
    }

    return reply({ ok: true, request: requestRow });
  } catch (error) {
    console.error("elite-media-request failed", error);
    return reply({ ok: false, error: "request_submission_failed" }, 500);
  }
});
