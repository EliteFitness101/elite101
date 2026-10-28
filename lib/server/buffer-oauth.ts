import { createCipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const BUFFER_REDIRECT_URI =
  process.env.BUFFER_REDIRECT_URI || "https://elite.resofit.fit/api/auth/buffer/callback";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new HttpError(503, "Buffer OAuth is not fully configured.");
  return value;
}

export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !publishableKey || !serviceRoleKey) {
    throw new HttpError(503, "Buffer OAuth backend configuration is incomplete.");
  }
  return { url, publishableKey, serviceRoleKey };
}

export function validateRedirectUri(): string {
  let parsed: URL;
  try {
    parsed = new URL(BUFFER_REDIRECT_URI);
  } catch {
    throw new HttpError(503, "Buffer OAuth redirect URI is invalid.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "elite.resofit.fit" ||
    parsed.pathname !== "/api/auth/buffer/callback" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new HttpError(503, "Buffer OAuth redirect URI must match the registered production callback exactly.");
  }
  return parsed.toString();
}

export async function requireAdmin(req: any): Promise<{ id: string; email: string }> {
  const authorization = String(req.headers?.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Sign in as an Elite administrator to connect Buffer.");

  const { url, publishableKey, serviceRoleKey } = supabaseConfig();
  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: publishableKey, authorization: `Bearer ${match[1]}` },
  });
  if (!userResponse.ok) throw new HttpError(401, "The current session could not be verified.");
  const user = await userResponse.json() as { id?: string; email?: string };
  if (!user.id || !user.email) throw new HttpError(401, "The current session is missing a verified user identity.");

  const rolesResponse = await fetch(
    `${url}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&select=user_id&limit=1`,
    { headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` } },
  );
  if (!rolesResponse.ok) throw new HttpError(503, "Administrator role verification is unavailable.");
  const roles = await rolesResponse.json() as Array<{ user_id: string }>;
  if (!Array.isArray(roles) || roles.length !== 1) {
    throw new HttpError(403, "Only an authenticated Elite administrator can connect Buffer.");
  }
  return { id: user.id, email: user.email.toLowerCase() };
}

export function makeSignedStateCookie(state: string, verifier: string): string {
  const secret = requiredEnv("BUFFER_OAUTH_STATE_SECRET");
  if (secret.length < 32) throw new HttpError(503, "Buffer OAuth state secret must be at least 32 characters.");
  const payload = Buffer.from(JSON.stringify({ state, verifier, issuedAt: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSignedStateCookie(value: string | undefined): { state: string; verifier: string; issuedAt: number } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const secret = process.env.BUFFER_OAUTH_STATE_SECRET || "";
  if (secret.length < 32) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof decoded.state !== "string" ||
      typeof decoded.verifier !== "string" ||
      typeof decoded.issuedAt !== "number" ||
      Date.now() - decoded.issuedAt > 10 * 60 * 1000 ||
      decoded.issuedAt > Date.now() + 30_000
    ) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function encryptTokenBundle(bundle: Record<string, unknown>) {
  const raw = requiredEnv("BUFFER_TOKEN_ENCRYPTION_KEY");
  let key: Buffer;
  try {
    key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  } catch {
    throw new HttpError(503, "Buffer token encryption key is invalid.");
  }
  if (key.length !== 32) throw new HttpError(503, "Buffer token encryption key must decode to 32 bytes.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(bundle), "utf8"), cipher.final()]);
  return {
    token_ciphertext: ciphertext.toString("base64"),
    token_iv: iv.toString("base64"),
    token_tag: cipher.getAuthTag().toString("base64"),
  };
}

export function clearStateCookie(res: any) {
  res.setHeader(
    "Set-Cookie",
    "buffer_oauth_state=; Path=/api/auth/buffer; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  );
}

export function fail(res: any, error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : "Buffer OAuth request failed.";
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json({ error: message });
}
