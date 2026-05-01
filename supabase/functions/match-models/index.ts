// Match approved models to a campaign using a deterministic scoring rubric.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: campaign, error: cErr } = await supabase
      .from("campaigns").select("*").eq("id", campaign_id).maybeSingle();
    if (cErr || !campaign) throw new Error("Campaign not found");

    const { data: models, error: mErr } = await supabase
      .from("models")
      .select("id, city, state, score, category")
      .eq("status", "approved");
    if (mErr) throw mErr;

    const ranked = (models || []).map((m) => {
      const category_fit = m.category === campaign.category ? 40 : 0;
      let location = 0;
      if (m.city && campaign.city && m.city.toLowerCase() === campaign.city.toLowerCase()) location = 20;
      else if (m.state && campaign.state && m.state.toLowerCase() === campaign.state.toLowerCase()) location = 10;
      const ai_score = Math.round((m.score ?? 0) * 0.4);
      const total = category_fit + location + ai_score;
      return {
        campaign_id,
        model_id: m.id,
        total_score: total,
        breakdown: { category_fit, location, ai_score },
      };
    }).sort((a, b) => b.total_score - a.total_score).slice(0, 30);

    // Wipe and re-insert
    await supabase.from("matches").delete().eq("campaign_id", campaign_id);
    if (ranked.length) {
      const { error: insErr } = await supabase.from("matches").insert(ranked);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ ok: true, count: ranked.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-models error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
