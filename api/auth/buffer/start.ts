import { createHash, randomBytes } from "node:crypto";
import {
  fail,
  makeSignedStateCookie,
  requiredEnv,
  requireAdmin,
  validateRedirectUri,
} from "../../../lib/server/buffer-oauth";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    await requireAdmin(req);
    const clientId = requiredEnv("BUFFER_CLIENT_ID");
    requiredEnv("BUFFER_CLIENT_SECRET");
    const redirectUri = validateRedirectUri();
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");

    const authorizationUrl = new URL("https://auth.buffer.com/auth");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set(
      "scope",
      "account:read account:write posts:read posts:write ideas:read ideas:write offline_access",
    );
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    authorizationUrl.searchParams.set("prompt", "consent");

    const cookie = makeSignedStateCookie(state, verifier);
    res.setHeader(
      "Set-Cookie",
      `buffer_oauth_state=${cookie}; Path=/api/auth/buffer; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    );
    return res.status(200).json({ authorizationUrl: authorizationUrl.toString() });
  } catch (error) {
    return fail(res, error);
  }
}
