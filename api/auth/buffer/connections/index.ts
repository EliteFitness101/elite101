import { fail, requireUser, supabaseConfig } from "../../../../lib/server/buffer-oauth.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const owner = await requireUser(req);
    const { url, serviceRoleKey } = supabaseConfig();
    const headers = { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` };
    const connectionResponse = await fetch(
      `${url}/rest/v1/buffer_oauth_connections?owner_user_id=eq.${encodeURIComponent(owner.id)}&select=id,label,account_email,account_name,status,last_verified_at,last_error,connected_at,created_at&order=created_at.desc&limit=10`,
      { headers },
    );
    if (!connectionResponse.ok) throw new Error("Could not load your Buffer connections.");
    const connections = await connectionResponse.json() as Array<Record<string, unknown>>;
    const channelResponse = await fetch(
      `${url}/rest/v1/buffer_channels?owner_user_id=eq.${encodeURIComponent(owner.id)}&select=channel_id,name,platform,active,publishing_enabled,provider_disconnected,provider_locked,connection_id&order=name.asc`,
      { headers },
    );
    if (!channelResponse.ok) throw new Error("Could not load your connected Buffer channels.");
    const channels = await channelResponse.json() as Array<Record<string, unknown>>;
    return res.status(200).json({
      connections: connections.map(({ id, label, account_email, account_name, status, last_verified_at, last_error, connected_at }) => ({
        id, label, account_email, account_name, status, last_verified_at, last_error, connected_at,
      })),
      channels: channels.map(({ channel_id, name, platform, active, publishing_enabled, provider_disconnected, provider_locked }) => ({
        channel_id, name, platform, active: Boolean(active) && !provider_disconnected && !provider_locked,
        publishing_enabled: Boolean(publishing_enabled),
      })),
    });
  } catch (error) {
    return fail(res, error);
  }
}
