import { HttpError, requireAdmin, supabaseConfig } from "../../../lib/server/buffer-oauth.js";
import { syncBufferConnection } from "../../../lib/server/buffer-multi.js";

function fail(res: any, error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : "Buffer publishing registry request failed.";
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json({ ok: false, error: message });
}
function bodyOf(req: any) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
}
async function db(path: string, method = "GET", body?: unknown, prefer?: string) {
  const { url, serviceRoleKey } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  if (!response.ok) throw new HttpError(502, "Publishing registry database operation failed.");
  return raw ? JSON.parse(raw) : null;
}
function safeKey(value: unknown, name: string) {
  const result = String(value || "").trim();
  if (!result || result.length > 160 || /[\r\n]/.test(result)) throw new HttpError(400, `A valid ${name} is required.`);
  return result;
}
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const admin = await requireAdmin(req);
    if (req.method === "GET") {
      const owner = encodeURIComponent(admin.id);
      const [connections, channels, assignments, authorizations, publications, assets, mediaIntake] = await Promise.all([
        db(`buffer_oauth_connections?owner_user_id=eq.${owner}&select=id,label,account_id,account_email,account_name,status,last_verified_at,last_error,connected_at,created_at&order=created_at.desc`),
        db(`buffer_channels?owner_user_id=eq.${owner}&select=id,organization_id,channel_id,platform,name,handle,channel_type,active,provider_disconnected,provider_locked,is_verified,publishing_enabled,last_synced_at,connection_id&order=name.asc`),
        db(`buffer_channel_assignments?owner_user_id=eq.${owner}&select=id,connection_id,organization_id,channel_id,client_key,host_id,expected_handle,assignment_status,owner_evidence,verified_at&order=created_at.desc`),
        db(`buffer_asset_authorizations?owner_user_id=eq.${owner}&select=id,asset_registry_id,client_key,host_id,channel_id,organization_id,rights_holder,authorization_status,expires_at,approved_at&order=created_at.desc&limit=100`),
        db("buffer_publications?select=id,channel_id,platform,buffer_post_id,status,scheduled_at,published_at,error_message,client_key,host_id,target_handle,created_at&order=created_at.desc&limit=30"),
        db("content_asset_registry?qa_status=eq.approved&rights_status=eq.verified&commercial_status=eq.authorized&origin_review_status=eq.approved&select=id,brand,campaign,asset_type,mime_type,source_url,canonical_url,qa_status,rights_status,commercial_status,origin_review_status,tiktok_eligible,youtube_eligible,google_business_eligible,created_at&order=created_at.desc&limit=100"),
        db("buffer_client_media_intake?select=id,owner_user_id,model_id,source_url,source_host,rights_holder,rights_evidence_url,status,asset_registry_id,review_note,created_at&order=created_at.desc&limit=100"),
      ]);
      const orgIds = [...new Set((connections || []).map((c: any) => c.id))];
      const organizations = orgIds.length ? await db(`buffer_organizations?connection_id=in.(${orgIds.join(",")})&select=id,connection_id,organization_id,name,active,last_synced_at&order=name.asc`) : [];
      return res.status(200).json({ ok: true, connections, organizations, channels, assignments, authorizations, publications, assets, media_intake: mediaIntake });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }
    const body = bodyOf(req);
    const action = String(body.action || "");
    if (action === "complete_media_intake") {
      const intakeId = safeKey(body.intake_id, "media intake ID");
      const assetId = safeKey(body.asset_id, "registered asset ID");
      const [intakes, assets] = await Promise.all([
        db(`buffer_client_media_intake?id=eq.${encodeURIComponent(intakeId)}&status=eq.pending&select=id,source_url,owner_user_id,model_id&limit=1`),
        db(`content_asset_registry?id=eq.${encodeURIComponent(assetId)}&select=id,source_url,canonical_url,qa_status,rights_status,commercial_status,origin_review_status&limit=1`),
      ]);
      if (!intakes?.length || !assets?.length) throw new HttpError(404, "Pending media intake or registered asset was not found.");
      const intake = intakes[0], asset = assets[0];
      if (asset.source_url !== intake.source_url && asset.canonical_url !== intake.source_url) throw new HttpError(409, "The registered asset source URL must exactly match the client-submitted URL.");
      if (asset.qa_status !== "approved" || asset.rights_status !== "verified" || asset.commercial_status !== "authorized" || asset.origin_review_status !== "approved") throw new HttpError(409, "Asset must pass QA, rights, commercial and origin review before intake can be completed.");
      await db(`buffer_client_media_intake?id=eq.${encodeURIComponent(intakeId)}`, "PATCH", {
        status: "ingested", asset_registry_id: assetId, review_note: "Matched to approved content asset registry by administrator.",
        updated_at: new Date().toISOString(),
      }, "return=minimal");
      return res.status(200).json({ ok: true, status: "ingested", asset_id: assetId, owner_user_id: intake.owner_user_id });
    }
    if (action === "reject_media_intake") {
      const intakeId = safeKey(body.intake_id, "media intake ID");
      const note = safeKey(body.review_note, "review note", 500);
      await db(`buffer_client_media_intake?id=eq.${encodeURIComponent(intakeId)}&status=eq.pending`, "PATCH", {
        status: "rejected", review_note: note, updated_at: new Date().toISOString(),
      }, "return=minimal");
      return res.status(200).json({ ok: true, status: "rejected" });
    }
    if (action === "sync") {
      const connectionId = safeKey(body.connection_id, "connection ID");
      const result = await syncBufferConnection(connectionId, admin.id);
      return res.status(200).json({ ok: true, result });
    }
    if (action === "assign_channel") {
      const channelId = safeKey(body.channel_id, "Buffer channel ID");
      const clientKey = safeKey(body.client_key, "client identity");
      const expectedHandle = safeKey(body.expected_handle, "channel handle").replace(/^@/, "");
      const hostId = body.host_id ? safeKey(body.host_id, "host ID") : null;
      const channels = await db(`buffer_channels?owner_user_id=eq.${admin.id}&channel_id=eq.${channelId}&select=channel_id,organization_id,connection_id,handle,is_verified&limit=1`);
      if (!channels?.length || !channels[0].is_verified || channels[0].handle?.replace(/^@/, "").toLowerCase() !== expectedHandle.toLowerCase()) {
        throw new HttpError(409, "The Buffer channel ID and handle must match a freshly synchronized channel.");
      }
      const evidenceUrl = String(body.owner_evidence_url || "").trim();
      if (!/^https:\/\//i.test(evidenceUrl)) throw new HttpError(400, "Provide an HTTPS ownership or client-authorization evidence URL.");
      await db("buffer_channel_assignments?on_conflict=connection_id%2Cchannel_id%2Cclient_key", "POST", [{
        owner_user_id: admin.id, connection_id: channels[0].connection_id,
        organization_id: channels[0].organization_id, channel_id: channelId,
        client_key: clientKey, host_id: hostId, expected_handle: expectedHandle,
        assignment_status: body.confirm_owner === true ? "verified" : "pending",
        owner_evidence: { url: evidenceUrl, attested_by: admin.email, attested_at: new Date().toISOString() },
        ...(body.confirm_owner === true ? { verified_by: admin.id, verified_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      }], "resolution=merge-duplicates,return=minimal");
      return res.status(200).json({ ok: true, assignment_status: body.confirm_owner === true ? "verified" : "pending" });
    }
    if (action === "authorize_asset") {
      const assetId = safeKey(body.asset_id, "asset ID");
      const channelId = safeKey(body.channel_id, "Buffer channel ID");
      const clientKey = safeKey(body.client_key, "client identity");
      const rightsHolder = safeKey(body.rights_holder, "rights holder");
      const evidenceUrl = String(body.rights_evidence_url || "").trim();
      if (!/^https:\/\//i.test(evidenceUrl) || body.confirm_rights !== true) {
        throw new HttpError(400, "Confirm rights and provide an HTTPS rights-evidence reference before authorizing this asset.");
      }
      const [assets, channels, assignments] = await Promise.all([
        db(`content_asset_registry?id=eq.${assetId}&select=id,asset_type,mime_type,canonical_url,qa_status,rights_status,commercial_status,origin_review_status,tiktok_eligible,youtube_eligible,google_business_eligible,publish_blockers&limit=1`),
        db(`buffer_channels?owner_user_id=eq.${admin.id}&channel_id=eq.${channelId}&select=channel_id,organization_id,connection_id,platform,is_verified,active,provider_disconnected,provider_locked&limit=1`),
        db(`buffer_channel_assignments?owner_user_id=eq.${admin.id}&channel_id=eq.${channelId}&client_key=eq.${encodeURIComponent(clientKey)}&assignment_status=eq.verified&select=id,host_id&limit=1`),
      ]);
      if (!assets?.length || assets[0].qa_status !== "approved" || assets[0].rights_status !== "verified" || assets[0].commercial_status !== "authorized" || assets[0].origin_review_status !== "approved") {
        throw new HttpError(409, "Asset is not cleared by the existing QA, rights, commercial and origin-review registry.");
      }
      if (!assets[0].canonical_url || !/^https:\/\//i.test(assets[0].canonical_url)) throw new HttpError(409, "Asset does not have a stable HTTPS media URL.");
      if (!channels?.length || !channels[0].is_verified || !channels[0].active || channels[0].provider_disconnected || channels[0].provider_locked) {
        throw new HttpError(409, "Target Buffer channel is not currently verified and connected.");
      }
      if (!assignments?.length) throw new HttpError(409, "Verify the client/host-to-channel ownership assignment first.");
      const platformField: Record<string, string> = { tiktok: "tiktok_eligible", youtube: "youtube_eligible", google_business: "google_business_eligible" };
      const field = platformField[channels[0].platform];
      if (field && assets[0][field] !== true) throw new HttpError(409, "This asset is not cleared for the target platform.");
      const hostId = body.host_id ? safeKey(body.host_id, "host ID") : assignments[0].host_id;
      await db("buffer_asset_authorizations?on_conflict=asset_registry_id%2Cchannel_id%2Cclient_key", "POST", [{
        owner_user_id: admin.id, asset_registry_id: assetId, client_key: clientKey, host_id: hostId,
        channel_id: channelId, organization_id: channels[0].organization_id,
        rights_holder: rightsHolder, permission_scope: ["organic_social"],
        evidence: { url: evidenceUrl, attested_by: admin.email, attested_at: new Date().toISOString() },
        authorization_status: "approved", approved_by: admin.id, approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }], "resolution=merge-duplicates,return=minimal");
      return res.status(200).json({ ok: true, authorization_status: "approved" });
    }
    if (action === "enable_channel") {
      const channelId = safeKey(body.channel_id, "Buffer channel ID");
      const clientKey = safeKey(body.client_key, "client identity");
      const assignments = await db(`buffer_channel_assignments?owner_user_id=eq.${admin.id}&channel_id=eq.${channelId}&client_key=eq.${encodeURIComponent(clientKey)}&assignment_status=eq.verified&select=id&limit=1`);
      if (!assignments?.length) throw new HttpError(409, "A verified client/host ownership assignment is required before enabling publishing.");
      await db(`buffer_channels?owner_user_id=eq.${admin.id}&channel_id=eq.${channelId}&is_verified=eq.true&active=eq.true&provider_disconnected=eq.false&provider_locked=eq.false`, "PATCH", {
        publishing_enabled: true, updated_at: new Date().toISOString(),
      }, "return=minimal");
      return res.status(200).json({ ok: true, publishing_enabled: true });
    }
    throw new HttpError(400, "Unknown Buffer registry action.");
  } catch (error) {
    return fail(res, error);
  }
}
