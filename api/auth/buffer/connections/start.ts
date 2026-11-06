import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  fail, makeSignedStateCookie, requiredEnv, requireAdmin, supabaseConfig, validateRedirectUri,
} from "../../../../lib/server/buffer-oauth.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    const admin = await requireAdmin(req);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const label = String(body.label || "Buffer account").trim().slice(0, 80) || "Buffer account";
    const clientId = requiredEnv("BUFFER_CLIENT_ID");
    requiredEnv("BUFFER_CLIENT_SECRET");
    const redirectUri = validateRedirectUri();
    const connectionId = randomUUID();
    const state = `${connectionId}.${randomBytes(32).toString("base64url")}`;
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const { url, serviceRoleKey } = supabaseConfig();
    const pending = await fetch(`${url}/rest/v1/buffer_oauth_connections`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json", Prefer: "return=minimal",
      },
      body: JSON.stringify({ id: connectionId, owner_user_id: admin.id, label, status: "pending" }),
    });
    if (!pending.ok) throw new Error("Could not create the pending Buffer connection.");
    const authorizationUrl = new URL("https://auth.buffer.com/auth");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "account:read posts:read posts:write offline_access");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("prompt", "consent");
    const cookie = makeSignedStateCookie(state, verifier);
    res.setHeader("Set-Cookie", `buffer_connections_state=${cookie}; Path=/api/auth/buffer; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    return res.status(200).json({ authorizationUrl: authorizationUrl.toString() });
  } catch (error) {
    return fail(res, error);
  }
}
