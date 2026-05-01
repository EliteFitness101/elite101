// Initialize a Paystack transaction for a booking.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMISSION_RATE = 0.15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { campaign_id, model_id, brand_id, amount_ngn } = await req.json();
    if (!campaign_id || !model_id || !brand_id || !amount_ngn) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    // Auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user?.email) throw new Error("Not authenticated");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const commission_ngn = Math.round(amount_ngn * COMMISSION_RATE);
    const reference = `ELITE_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Insert booking pending
    const { error: bErr } = await supabase.from("bookings").insert({
      campaign_id, model_id, brand_id,
      amount_ngn, commission_ngn,
      paystack_ref: reference,
      status: "pending",
    });
    if (bErr) throw bErr;

    const callback_url = `${req.headers.get("origin") || "http://localhost"}/booking/success`;

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amount_ngn * 100, // kobo
        reference,
        callback_url,
        currency: "NGN",
        metadata: { campaign_id, model_id, brand_id },
      }),
    });
    const psData = await psRes.json();
    if (!psRes.ok || !psData.status) {
      throw new Error(psData.message || "Paystack init failed");
    }

    return new Response(JSON.stringify({
      authorization_url: psData.data.authorization_url,
      reference,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("paystack-init error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
