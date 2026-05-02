// Staging test: signs a sample Paystack charge.success payload with PAYSTACK_SECRET_KEY,
// posts it to the deployed webhook, and verifies the matching booking flips to "paid".
//
// Run via the test_edge_functions tool. Requires these env vars (loaded from .env or shell):
//   - PAYSTACK_SECRET_KEY        (same one stored in Lovable Cloud secrets)
//   - VITE_SUPABASE_URL
//   - VITE_SUPABASE_PUBLISHABLE_KEY
//   - SUPABASE_SERVICE_ROLE_KEY  (only needed for the seed/verify steps)
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;

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

Deno.test("paystack-webhook rejects bad signature with 401", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": "deadbeef" },
    body: JSON.stringify({ event: "charge.success", data: { reference: "nope" } }),
  });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("paystack-webhook accepts valid signature and marks booking paid", async () => {
  if (!PAYSTACK_SECRET || !SERVICE_ROLE) {
    console.warn("Skipping: PAYSTACK_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY missing");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Pick any existing pending booking, or skip if none.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, paystack_ref, status")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (!booking?.paystack_ref) {
    console.warn("Skipping: no pending booking to test against. Create one via the app first.");
    return;
  }

  // 2. Build payload using the real reference.
  const sample = JSON.parse(await Deno.readTextFile(new URL("./sample-payload.json", import.meta.url)));
  sample.data.reference = booking.paystack_ref;
  const body = JSON.stringify(sample);
  const signature = await hmacSha512Hex(PAYSTACK_SECRET, body);

  // 3. POST to the deployed webhook.
  const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": signature },
    body,
  });
  const text = await res.text();
  console.log(`webhook -> ${res.status} ${text}`);
  assertEquals(res.status, 200);

  // 4. Re-read the booking and confirm status flipped.
  const { data: after } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", booking.id)
    .maybeSingle();
  assertEquals(after?.status, "paid");
});
