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
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    if (!PAYSTACK_SECRET || !SERVICE_ROLE) {
      console.warn("Skipping: PAYSTACK_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY missing");
      return;
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 0 } },
    });

    // 1. Seed a synthetic auth user → brand → model → campaign → pending booking.
    const stamp = Date.now();
    const email = `webhook-test-${stamp}@elite.test`;
    const { data: created, error: uErr } = await supabase.auth.admin.createUser({
      email, password: crypto.randomUUID(), email_confirm: true,
    });
    if (uErr || !created.user) throw uErr ?? new Error("user create failed");
    const userId = created.user.id;

    try {
      const { data: brand, error: bErr } = await supabase
        .from("brands").insert({ user_id: userId, name: "Test Brand" }).select().single();
      if (bErr) throw bErr;

      const { data: model, error: mErr } = await supabase
        .from("models").insert({ user_id: userId, full_name: "Test Model", status: "approved" }).select().single();
      if (mErr) throw mErr;

      const { data: campaign, error: cErr } = await supabase
        .from("campaigns").insert({ brand_id: brand.id, title: "Webhook Test Campaign", budget_ngn: 50000 }).select().single();
      if (cErr) throw cErr;

      const reference = `ELITE_TEST_${stamp}_${crypto.randomUUID().slice(0, 8)}`;
      const { data: booking, error: bookErr } = await supabase.from("bookings").insert({
        campaign_id: campaign.id, model_id: model.id, brand_id: brand.id,
        amount_ngn: 50000, commission_ngn: 7500, paystack_ref: reference, status: "pending",
      }).select().single();
      if (bookErr) throw bookErr;

      // 2. Sign sample payload with the live Paystack secret.
      const sample = JSON.parse(await Deno.readTextFile(new URL("./sample-payload.json", import.meta.url)));
      sample.data.reference = reference;
      const body = JSON.stringify(sample);
      const signature = await hmacSha512Hex(PAYSTACK_SECRET, body);

      // 3. POST to deployed webhook.
      const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-paystack-signature": signature },
        body,
      });
      const text = await res.text();
      console.log(`webhook -> ${res.status} ${text}`);
      assertEquals(res.status, 200);

      // 4. Confirm status flipped.
      const { data: after } = await supabase
        .from("bookings").select("status").eq("id", booking.id).maybeSingle();
      assertEquals(after?.status, "paid");
      console.log(`✅ Booking ${booking.id} flipped pending → paid`);
    } finally {
      // Cleanup cascades through all FKs.
      await supabase.auth.admin.deleteUser(userId);
    }
  },
});
