import {
  clearStateCookie,
  encryptTokenBundle,
  readSignedStateCookie,
  requiredEnv,
  supabaseConfig,
  validateRedirectUri,
} from "../../../lib/server/buffer-oauth.js";
import { completeBufferOAuthConnection } from "../../../lib/server/buffer-multi-oauth.js";

function finish(res: any, status: string) {
  clearStateCookie(res);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  return res.redirect(302, `/dashboard/admin?buffer_oauth=${encodeURIComponent(status)}`);
}

function readCookie(req: any, name: string): string | undefined {
  const raw = String(req.headers?.cookie || "");
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

function finishConnection(res: any, status: string, destination = "/dashboard/elite-media/ceo") {
  res.setHeader("Set-Cookie", "buffer_connections_state=; Path=/api/auth/buffer; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  return res.redirect(302, `${destination}?buffer_connection=${encodeURIComponent(status)}`);
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const query = req.query || {};
  const state = typeof query.state === "string" ? query.state : "";
  const code = typeof query.code === "string" ? query.code : "";
  const providerError = typeof query.error === "string" ? query.error : "";
  const saved = readSignedStateCookie(readCookie(req, "buffer_oauth_state"));

  const connectionSaved = readSignedStateCookie(readCookie(req, "buffer_connections_state"));
  if (connectionSaved) {
    if (!state || state !== connectionSaved.state) return finishConnection(res, "state_invalid");
    if (providerError) return finishConnection(res, "authorization_denied");
    if (!code) return finishConnection(res, "code_missing");
    const connectionId = connectionSaved.state.split(".")[0];
    if (!/^[0-9a-f-]{36}$/i.test(connectionId)) return finishConnection(res, "state_invalid");
    let destination = "/dashboard/elite-media/ceo";
    try {
      const { url, serviceRoleKey } = supabaseConfig();
      const ownerResponse = await fetch(`${url}/rest/v1/buffer_oauth_connections?id=eq.${connectionId}&select=owner_user_id&limit=1`, {
        headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
      });
      const ownerRows = ownerResponse.ok ? await ownerResponse.json() as Array<{ owner_user_id: string }> : [];
      if (!ownerResponse.ok || !ownerRows[0]?.owner_user_id) {
        return finishConnection(res, "connection_failed");
      }
      const roleResponse = await fetch(`${url}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(ownerRows[0].owner_user_id)}&role=in.(model,brand,admin)&select=role&limit=1`, {
        headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
      });
      const roles = roleResponse.ok ? await roleResponse.json() as Array<{ role: string }> : [];
      if (!roles.length) return finishConnection(res, "connection_failed");
      const role = roles[0].role;
      destination = role === "model" ? "/dashboard/model" : role === "brand" ? "/dashboard/brand" : "/dashboard/admin";
      await completeBufferOAuthConnection(connectionId, code, connectionSaved.verifier);
      return finishConnection(res, "connected", destination);
    } catch {
      return finishConnection(res, "connection_failed", destination);
    }
  }


  if (!saved || !state || state !== saved.state) {
    return finish(res, "state_invalid");
  }
  if (providerError) return finish(res, "authorization_denied");
  if (!code) return finish(res, "code_missing");

  try {
    const clientId = requiredEnv("BUFFER_CLIENT_ID");
    const clientSecret = requiredEnv("BUFFER_CLIENT_SECRET");
    const redirectUri = validateRedirectUri();
    const { url, serviceRoleKey } = supabaseConfig();

    const tokenResponse = await fetch("https://auth.buffer.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: saved.verifier,
      }),
    });

    const tokens = await tokenResponse.json().catch(() => ({})) as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
    };
    if (
      !tokenResponse.ok ||
      !tokens.access_token ||
      !tokens.refresh_token ||
      !Number.isFinite(tokens.expires_in) ||
      Number(tokens.expires_in) <= 0
    ) {
      return finish(res, "token_exchange_failed");
    }

    const encrypted = encryptTokenBundle({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || "Bearer",
      scope: tokens.scope || "",
      obtained_at: new Date().toISOString(),
    });

    const expiresAt = new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString();
    const persistResponse = await fetch(
      `${url}/rest/v1/resofit_buffer_oauth_credentials?on_conflict=singleton`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          singleton: true,
          ...encrypted,
          scope: tokens.scope || "",
          token_type: tokens.token_type || "Bearer",
          expires_at: expiresAt,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      },
    );

    if (!persistResponse.ok) return finish(res, "token_persistence_failed");

    // Keep the existing server-side Buffer publisher on the current OAuth access token.
    // Tokens are sent only to a service-role RPC; never return them to the browser.
    const bridgeResponse = await fetch(`${url}/rest/v1/rpc/store_buffer_oauth_tokens`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_access_token: tokens.access_token,
        p_refresh_token: tokens.refresh_token,
      }),
    });
    if (!bridgeResponse.ok) return finish(res, "publisher_token_sync_failed");

    return finish(res, "connected");
  } catch (error) {
    const status = error instanceof Error && /configuration|secret|key|redirect/i.test(error.message)
      ? "configuration_missing"
      : "callback_failed";
    clearStateCookie(res);
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, `/dashboard/admin?buffer_oauth=${status}`);
  }
}
