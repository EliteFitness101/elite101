// Paystack webhook — verifies HMAC signature, updates booking, forwards to Make.com,
// and sends a Telegram notification. Public endpoint (no JWT); security via x-paystack-signature.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/p0c26asklninfrxhp2sw6nkdjjb19a89";
const TELEGRAM_GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    // Forward verified event to Make.com (fire-and-forget; don't block Paystack response).
    forwardToMake(body).catch((e) => console.error("make.com forward error:", e));

    if (event.event === "charge.success") {
      const { email, reference, amount, metadata } = event.data ?? {};
      const sku = metadata?.sku || "RFX-DG-INT-33D";
      const amountNgn = amount ? amount / 100 : 0;
      console.log(`[ResoFlex] Payment Verified for: ${email} | ref: ${reference} | SKU: ${sku}`);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      if (reference) {
        const { data: booking, error } = await supabase
          .from("bookings").update({ status: "paid" })
          .eq("paystack_ref", reference).select().maybeSingle();
        if (error) console.error("booking update error:", error);
        else if (booking) await triggerInitiationBot(email, sku, booking, amountNgn);
        else {
          console.warn(`No booking found for ref ${reference} — sending generic Telegram alert`);
          await sendTelegram(`💸 <b>Paystack payment</b>\nRef: <code>${reference}</code>\nAmount: ₦${amountNgn.toLocaleString()}\nEmail: ${email}\nSKU: ${sku}\n(no matching booking)`);
        }
      }
    }

    return new Response("Success", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("paystack-webhook error:", e);
    return new Response("Error logged", { status: 200, headers: corsHeaders });
  }
});

async function forwardToMake(rawBody: string) {
  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
  console.log(`[ResoFlex] make.com -> ${res.status}`);
  await res.text();
}

async function sendTelegram(text: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY || !chatId) {
    console.warn("Telegram not fully configured — skipping notification");
    return;
  }
  const res = await fetch(`${TELEGRAM_GATEWAY}/sendMessage`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  const txt = await res.text();
  if (!res.ok) console.error(`telegram send failed [${res.status}]: ${txt}`);
}

async function triggerInitiationBot(email: string, sku: string, booking: any, amountNgn: number) {
  const msg =
    `✅ <b>Booking Paid</b>\n` +
    `Booking: <code>${booking.id}</code>\n` +
    `Amount: ₦${amountNgn.toLocaleString()}\n` +
    `Commission: ₦${Number(booking.commission_ngn ?? 0).toLocaleString()}\n` +
    `SKU: ${sku}\n` +
    `Buyer: ${email}\n` +
    `Ref: <code>${booking.paystack_ref}</code>`;
  await sendTelegram(msg);
}
