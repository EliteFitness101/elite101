import { encryptTokenBundle, HttpError, requiredEnv, supabaseConfig } from "./buffer-oauth.js";
import { syncBufferConnection } from "./buffer-multi.js";

export async function completeBufferOAuthConnection(connectionId: string, code: string, verifier: string) {
  const { url, serviceRoleKey } = supabaseConfig();
  const pendingResponse = await fetch(`${url}/rest/v1/buffer_oauth_connections?id=eq.${connectionId}&select=id,owner_user_id,status&limit=1`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!pendingResponse.ok) throw new HttpError(502, "Could not verify the pending Buffer connection.");
  const pending = await pendingResponse.json() as Array<{ id: string; owner_user_id: string; status: string }>;
  if (!pending.length || pending[0].status !== "pending") throw new HttpError(400, "This Buffer connection request is no longer valid.");

  const redirectUri = process.env.BUFFER_REDIRECT_URI || "https://elite.resofit.fit/api/auth/buffer/callback";
  const tokenResponse = await fetch("https://auth.buffer.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: requiredEnv("BUFFER_CLIENT_ID"),
      client_secret: requiredEnv("BUFFER_CLIENT_SECRET"),
      grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier,
    }),
  });
  const tokens = await tokenResponse.json().catch(() => ({})) as any;
  if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token || !Number.isFinite(tokens.expires_in)) {
    throw new HttpError(502, "Buffer authorization token exchange failed. Restart the connection.");
  }
  const encrypted = encryptTokenBundle({
    access_token: tokens.access_token, refresh_token: tokens.refresh_token,
    token_type: tokens.token_type || "Bearer", scope: tokens.scope || "",
    obtained_at: new Date().toISOString(),
  });
  const saved = await fetch(`${url}/rest/v1/buffer_oauth_connections?id=eq.${connectionId}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify({
      ...encrypted, token_type: tokens.token_type || "Bearer", scope: tokens.scope || "",
      expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
      status: "connected", connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }),
  });
  if (!saved.ok) throw new HttpError(502, "Buffer credentials were received but could not be stored.");
  return await syncBufferConnection(connectionId, pending[0].owner_user_id);
}
