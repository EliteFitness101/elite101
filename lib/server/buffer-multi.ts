import { decryptTokenBundle, encryptTokenBundle, HttpError, requiredEnv, supabaseConfig } from "./buffer-oauth.js";

type Connection = {
  id: string;
  owner_user_id: string;
  account_id: string | null;
  token_ciphertext: string;
  token_iv: string;
  token_tag: string;
  expires_at: string | null;
  refresh_lock_until: string | null;
};

type BufferChannel = {
  id: string;
  name?: string;
  displayName?: string;
  service: string;
  type?: string;
  isDisconnected?: boolean;
  isLocked?: boolean;
};

async function rest(path: string, method = "GET", body?: unknown, prefer?: string) {
  const { url, serviceRoleKey } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  if (!response.ok) throw new HttpError(502, `Elite publishing database request failed (${response.status}).`);
  return raw ? JSON.parse(raw) : null;
}

export async function bufferGraphQL(accessToken: string, query: string) {
  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query }),
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok || payload.errors?.length) {
    const message = String(payload.errors?.[0]?.message || "Buffer API request failed.");
    if (response.status === 401) throw new HttpError(401, "Buffer authorization expired. Reconnect this organization.");
    throw new HttpError(502, message.slice(0, 300));
  }
  return payload.data;
}

export async function getConnection(connectionId: string, ownerUserId?: string): Promise<Connection & Record<string, any>> {
  const query = new URLSearchParams({ id: `eq.${connectionId}`, select: "*", limit: "1" });
  if (ownerUserId) query.set("owner_user_id", `eq.${ownerUserId}`);
  const rows = await rest(`buffer_oauth_connections?${query.toString()}`);
  if (!Array.isArray(rows) || rows.length !== 1) throw new HttpError(404, "Buffer organization connection was not found.");
  return rows[0];
}

export async function getFreshBufferToken(connection: Connection): Promise<string> {
  const tokenBundle = decryptTokenBundle(connection);
  const expiry = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  if (expiry > Date.now() + 120_000) return String(tokenBundle.access_token);

  const { url, serviceRoleKey } = supabaseConfig();
  const claimResponse = await fetch(`${url}/rest/v1/rpc/claim_buffer_oauth_refresh`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_connection_id: connection.id }),
  });
  if (!claimResponse.ok) throw new HttpError(409, "Buffer token refresh is already in progress. Retry shortly.");
  const claimed = await claimResponse.json().catch(() => false);
  if (claimed !== true) throw new HttpError(409, "Buffer token refresh is already in progress. Retry shortly.");

  try {
    const params = new URLSearchParams({
      client_id: requiredEnv("BUFFER_CLIENT_ID"),
      client_secret: requiredEnv("BUFFER_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: String(tokenBundle.refresh_token),
    });
    const refreshResponse = await fetch("https://auth.buffer.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: params,
    });
    const tokens = await refreshResponse.json().catch(() => ({})) as any;
    if (!refreshResponse.ok || !tokens.access_token || !tokens.refresh_token || !Number.isFinite(tokens.expires_in)) {
      await rest(`buffer_oauth_connections?id=eq.${connection.id}`, "PATCH", {
        status: "needs_reauth", last_error: "Buffer token refresh failed.", updated_at: new Date().toISOString(),
      }, "return=minimal");
      throw new HttpError(401, "Buffer authorization needs to be reconnected.");
    }
    const encrypted = encryptTokenBundle({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || "Bearer",
      scope: tokens.scope || "",
      obtained_at: new Date().toISOString(),
    });
    await rest(`buffer_oauth_connections?id=eq.${connection.id}`, "PATCH", {
      ...encrypted,
      token_type: tokens.token_type || "Bearer",
      scope: tokens.scope || "",
      expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
      status: "connected",
      last_error: null,
      updated_at: new Date().toISOString(),
    }, "return=minimal");
    return String(tokens.access_token);
  } finally {
    await fetch(`${url}/rest/v1/rpc/release_buffer_oauth_refresh`, {
      method: "POST",
      headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_connection_id: connection.id }),
    }).catch(() => undefined);
  }
}

function mapPlatform(service: string): string | null {
  const value = service.toLowerCase().replace(/[ -]/g, "_");
  const map: Record<string, string> = {
    tiktok: "tiktok", youtube: "youtube", instagram: "instagram",
    google_business: "google_business", google_business_profile: "google_business",
    googlebusinessprofile: "google_business", pinterest: "pinterest", linkedin: "linkedin",
  };
  return map[value] || null;
}

export async function syncBufferConnection(connectionId: string, ownerUserId: string) {
  const connection = await getConnection(connectionId, ownerUserId);
  const token = await getFreshBufferToken(connection);
  const accountData = await bufferGraphQL(token, `query EliteBufferAccount {
    account { id email name timezone organizations { id name } }
  }`);
  const account = accountData?.account;
  if (!account?.id || !Array.isArray(account.organizations)) {
    throw new HttpError(502, "Buffer account response did not include its organizations.");
  }
  const { url, serviceRoleKey } = supabaseConfig();
  await rest(`buffer_oauth_connections?id=eq.${connectionId}`, "PATCH", {
    account_id: account.id, account_email: account.email || null, account_name: account.name || null,
    status: "connected", last_verified_at: new Date().toISOString(), last_error: null,
    updated_at: new Date().toISOString(),
  }, "return=minimal");

  const synced: Array<{ organizationId: string; name: string; channels: number }> = [];
  for (const org of account.organizations) {
    await rest("buffer_organizations?on_conflict=connection_id%2Corganization_id", "POST", [{
      connection_id: connectionId, organization_id: org.id, name: org.name,
      active: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }], "resolution=merge-duplicates,return=minimal");

    const channelData = await bufferGraphQL(token, `query EliteBufferChannels {
      channels(input: { organizationId: "${String(org.id).replace(/"/g, "")}" }) {
        id name displayName service type isDisconnected isLocked
      }
    }`);
    const channels = (channelData?.channels || []) as BufferChannel[];
    for (const channel of channels) {
      const platform = mapPlatform(channel.service);
      if (!platform || !channel.id) continue;
      const existingQuery = new URLSearchParams({ channel_id: `eq.${channel.id}`, select: "publishing_enabled", limit: "1" });
      const existing = await rest(`buffer_channels?${existingQuery.toString()}`);
      const publishingEnabled = Array.isArray(existing) && existing[0]?.publishing_enabled === true;
      const active = !channel.isDisconnected && !channel.isLocked;
      await rest("buffer_channels?on_conflict=channel_id", "POST", [{
        organization_id: org.id, channel_id: channel.id, platform,
        name: channel.displayName || channel.name || channel.id,
        handle: channel.name || channel.displayName || null,
        channel_type: channel.type || "account",
        connection_id: connectionId, owner_user_id: ownerUserId,
        provider_disconnected: Boolean(channel.isDisconnected), provider_locked: Boolean(channel.isLocked),
        active, is_verified: true, publishing_enabled: publishingEnabled && active,
        verified_at: new Date().toISOString(), last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }], "resolution=merge-duplicates,return=minimal");
    }
    synced.push({ organizationId: org.id, name: org.name, channels: channels.length });
  }
  return { account: { id: account.id, email: account.email, name: account.name }, organizations: synced };
}
