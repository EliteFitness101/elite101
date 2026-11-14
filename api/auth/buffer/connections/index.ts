import { fail, requireUser, supabaseConfig } from "../../../../lib/server/buffer-oauth.js";
import { syncBufferConnection } from "../../../../lib/server/buffer-multi.js";

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
    const ownerFilter = encodeURIComponent(owner.id);
    const loadConnections = async () => {
      const response = await fetch(
        `${url}/rest/v1/buffer_oauth_connections?owner_user_id=eq.${ownerFilter}&select=id,label,account_email,account_name,status,last_verified_at,last_error,connected_at,created_at,expires_at&order=created_at.desc&limit=10`,
        { headers },
      );
      if (!response.ok) throw new Error("Could not load your Buffer connections.");
      return await response.json() as Array<Record<string, any>>;
    };

    let connections = await loadConnections();
    // Refresh expired/near-expiry tokens before reporting a connection as healthy.
    // The refresh helper persists rotated tokens and syncs account/channel state.
    for (const connection of connections) {
      const expiry = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
      if (connection.status === "connected" && expiry <= Date.now() + 120_000) {
        try {
          await syncBufferConnection(String(connection.id), owner.id);
        } catch (error) {
          console.error("Buffer connection refresh/sync failed", {
            connectionId: connection.id,
            status: error instanceof Error && "status" in error ? (error as any).status : undefined,
          });
        }
      }
    }
    connections = await loadConnections();

    const channelResponse = await fetch(
      `${url}/rest/v1/buffer_channels?owner_user_id=eq.${ownerFilter}&select=channel_id,name,platform,active,publishing_enabled,provider_disconnected,provider_locked,connection_id&order=name.asc`,
      { headers },
    );
    if (!channelResponse.ok) throw new Error("Could not load your connected Buffer channels.");
    const channels = await channelResponse.json() as Array<Record<string, unknown>>;
    return res.status(200).json({
      connections: connections.map(({ id, label, account_email, account_name, status, last_verified_at, last_error, connected_at, expires_at }) => ({
        id, label, account_email, account_name,
        status: status === "connected" && (!expires_at || new Date(String(expires_at)).getTime() <= Date.now())
          ? "refresh_pending"
          : status,
        last_verified_at, last_error, connected_at, expires_at,
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
