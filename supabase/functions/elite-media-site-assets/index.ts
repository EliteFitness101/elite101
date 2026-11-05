import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const headers = {
  "Access-Control-Allow-Origin": "https://elite.resofit.fit",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

function approvedPublicVideo(row: any) {
  if (row.asset_type !== "video" || row.mime_type !== "video/mp4") return false;
  if (row.qa_status !== "verified" || row.rights_status !== "approved" || row.origin_review_status !== "approved") return false;
  if (row.commercial_status === "blocked" || row.commercial_status === "review_required") return false;
  if (Array.isArray(row.publish_blockers) && row.publish_blockers.length) return false;
  try {
    const url = new URL(String(row.canonical_url || ""));
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host !== "vbqjvmnhdtdhmeeudqnn.supabase.co" && host !== "media.resofit.fit" && !host.endsWith(".public.blob.vercel-storage.com")) return false;
    return true;
  } catch { return false; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "GET") return reply({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const { data, error } = await db.from("content_asset_registry")
      .select("id,canonical_url,asset_type,mime_type,brand,campaign,qa_status,rights_status,commercial_status,origin_review_status,visual_summary,alt_text,intelligence,publish_blockers,updated_at")
      .eq("brand", "Elite NG")
      .eq("campaign", "elite_site_onboarding")
      .eq("qa_status", "verified")
      .eq("rights_status", "approved")
      .eq("origin_review_status", "approved")
      .order("updated_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    const assets: Record<string, unknown> = {};
    for (const row of data || []) {
      if (!approvedPublicVideo(row)) continue;
      const slot = String(row.intelligence?.site_slot || "").trim();
      if (!slot || slot.length > 80 || assets[slot]) continue;
      assets[slot] = {
        id: row.id,
        src: row.canonical_url,
        title: row.visual_summary || "Elite NG video guide",
        alt: row.alt_text || row.visual_summary || "Elite NG video guide",
        updated_at: row.updated_at,
      };
    }
    return reply({ ok: true, assets, source: "content_asset_registry", generated_at: new Date().toISOString() });
  } catch (error) {
    console.error("elite-media-site-assets", error);
    return reply({ ok: false, error: "site_media_unavailable" }, 503);
  }
});
