// Paystack webhook — verifies HMAC signature and processes charge.success events.
// Public endpoint (no JWT) — security is enforced via Paystack's x-paystack-signature.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

// HMAC-SHA512 using Web Crypto (Deno-native — no Node shim).
async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string compare.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const signature = req.headers.get("x-paystack-signature") ?? "";
    const body = await req.text();
    const expected = await hmacSha512Hex(PAYSTACK_SECRET, body);

    if (!signature || !safeEqual(expected, signature)) {
      console.warn("paystack-webhook: signature mismatch");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(body);
    console.log(`[ResoFlex] paystack event: ${event.event}`);

    if (event.event === "charge.success") {
      const { email, reference, metadata } = event.data ?? {};
      const sku = metadata?.sku || "RFX-DG-INT-33D";
      console.log(`[ResoFlex] Payment Verified for: ${email} | ref: ${reference} | SKU: ${sku}`);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Mark booking paid (idempotent — webhook may arrive before/after the success-page verify).
      if (reference) {
        const { data: booking, error } = await supabase
          .from("bookings")
          .update({ status: "paid" })
          .eq("paystack_ref", reference)
          .select()
          .maybeSingle();
        if (error) console.error("booking update error:", error);
        else if (booking) await triggerInitiationBot(email, sku, booking);
        else console.warn(`No booking found for ref ${reference}`);
      }
    }

    return new Response("Success", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("paystack-webhook error:", e);
    // Still 200 so Paystack doesn't endlessly retry on our bugs; logs capture the failure.
    return new Response("Error logged", { status: 200, headers: corsHeaders });
  }
});

// Stub: connect a Telegram bot (or email provider) here to send the D01 Initiation message.
async function triggerInitiationBot(email: string, sku: string, booking: any) {
  console.log(`[ResoFlex] TODO triggerInitiationBot — email=${email} sku=${sku} booking=${booking.id}`);
  // Example (once a Telegram bot is connected):
  // await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", { ... });
}
