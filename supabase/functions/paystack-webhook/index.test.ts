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

Deno.test({
  name: "paystack-webhook accepts valid signature and marks booking paid",
  // supabase-js opens a realtime heartbeat interval; disable leak checks.
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    if (!PAYSTACK_SECRET || !SERVICE_ROLE) {
      console.warn("Skipping: PAYSTACK_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY missing");
      return;
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 0 } },
    });

    // 1. Seed a pending booking with a unique reference (synthetic FKs are fine — no DB FK constraints).
    const reference = `ELITE_TEST_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const { data: seeded, error: seedErr } = await supabase
      .from("bookings")
      .insert({
        campaign_id: crypto.randomUUID(),
        model_id: crypto.randomUUID(),
        brand_id: crypto.randomUUID(),
        amount_ngn: 50000,
        commission_ngn: 7500,
        paystack_ref: reference,
        status: "pending",
      })
      .select()
      .single();
    if (seedErr) throw seedErr;

    try {
      // 2. Build signed payload.
      const sample = JSON.parse(await Deno.readTextFile(new URL("./sample-payload.json", import.meta.url)));
      sample.data.reference = reference;
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

      // 4. Confirm status flipped to "paid".
      const { data: after } = await supabase
        .from("bookings")
        .select("status")
        .eq("id", seeded.id)
        .maybeSingle();
      assertEquals(after?.status, "paid");
    } finally {
      // Cleanup seed row (bookings has no DELETE policy for users, but service role bypasses RLS).
      await supabase.from("bookings").delete().eq("id", seeded.id);
    }
  },
});
