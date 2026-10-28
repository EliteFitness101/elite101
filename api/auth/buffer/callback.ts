import {
  clearStateCookie,
  encryptTokenBundle,
  fail,
  readSignedStateCookie,
  requiredEnv,
  supabaseConfig,
  validateRedirectUri,
} from "../../../lib/server/buffer-oauth";

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
