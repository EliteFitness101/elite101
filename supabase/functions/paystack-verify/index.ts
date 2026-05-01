// Verify a Paystack transaction and mark the booking as paid.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const psData = await psRes.json();
    if (!psRes.ok || !psData.status) throw new Error(psData.message || "Verify failed");

    const success = psData.data.status === "success";
    const newStatus = success ? "paid" : "cancelled";

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("paystack_ref", reference)
      .select()
      .maybeSingle();
    if (bErr) throw bErr;

    return new Response(JSON.stringify({ success, booking }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paystack-verify error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
