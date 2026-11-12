import { randomUUID } from "node:crypto";
import { HttpError, fail, requireUser, supabaseConfig } from "../../../lib/server/buffer-oauth.js";

function bodyOf(req: any) { return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
function key(value: unknown, label: string, max = 240) {
  const result = String(value || "").trim();
  if (!result || result.length > max || /[\\r\\n]/.test(result)) throw new HttpError(400, `A valid ${label} is required.`);
  return result;
}
async function db(path: string, method = "GET", body?: unknown, prefer?: string) {
  const { url, serviceRoleKey } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  if (!response.ok) throw new HttpError(502, "Client publishing workspace registry request failed.");
  return raw ? JSON.parse(raw) : null;
}
async function modelFor(ownerId: string) {
  const [roles, models] = await Promise.all([
    db(`user_roles?user_id=eq.${ownerId}&role=eq.model&select=user_id&limit=1`),
    db(`models?user_id=eq.${ownerId}&select=id,full_name,instagram,status&limit=1`),
  ]);
  if (!roles?.length || !models?.length) throw new HttpError(403, "A model workspace is required to manage client publishing.");
  return models[0];
}
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  try {
    const owner = await requireUser(req);
    const model = await modelFor(owner.id);
    if (req.method === "GET") {
      const channels = await db(`buffer_channels?owner_user_id=eq.${owner.id}&select=channel_id,organization_id,connection_id,platform,name,handle,active,is_verified,publishing_enabled,provider_disconnected,provider_locked&order=name.asc`);
      const assignments = await db(`buffer_channel_assignments?owner_user_id=eq.${owner.id}&client_key=eq.${model.id}&select=id,channel_id,organization_id,client_key,host_id,expected_handle,assignment_status,verified_at&order=created_at.desc`);
      const hostIds = [...new Set((assignments || []).filter((row: any) => row.assignment_status === "verified").map((row: any) => row.host_id).filter(Boolean))];
      const highlights = hostIds.length ? await db(`resofit_live_highlights?host_id=in.(${hostIds.map(encodeURIComponent).join(",")})&select=id,host_id,title,caption,imagekit_url,status,content_asset_id,created_at&order=created_at.desc&limit=100`) : [];
      const intake = await db(`buffer_client_media_intake?owner_user_id=eq.${owner.id}&model_id=eq.${model.id}&select=id,source_url,status,asset_registry_id,review_note,created_at&order=created_at.desc&limit=30`);
      const highlightAssetIds = (highlights || []).map((row: any) => row.content_asset_id).filter(Boolean);
      const intakeAssetIds = (intake || []).filter((row: any) => row.status === "ingested" && row.asset_registry_id).map((row: any) => row.asset_registry_id);
      const assetIds = [...new Set([...highlightAssetIds, ...intakeAssetIds])];
      const assets = assetIds.length ? await db(`content_asset_registry?id=in.(${assetIds.join(",")})&select=id,asset_type,mime_type,canonical_url,qa_status,rights_status,commercial_status,origin_review_status,publish_blockers,tiktok_eligible,youtube_eligible,google_business_eligible&order=created_at.desc`) : [];
      const authorizations = await db(`buffer_asset_authorizations?owner_user_id=eq.${owner.id}&client_key=eq.${model.id}&select=id,asset_registry_id,channel_id,organization_id,authorization_status,rights_holder,expires_at&order=created_at.desc&limit=100`);
      return res.status(200).json({ ok: true, model: { id: model.id, name: model.full_name }, channels, assignments, highlights, assets, authorizations, media_intake: intake });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }
    const body = bodyOf(req);
    const action = String(body.action || "");
    if (action === "map_channel") {
      const channelId = key(body.channel_id, "Buffer channel");
      const hostId = key(body.host_id, "Highlights host ID", 160);
      const hostEvidenceUrl = key(body.host_evidence_url, "host ownership evidence URL", 1000);
      if (!/^https:\/\//i.test(hostEvidenceUrl)) throw new HttpError(400, "Provide an HTTPS public profile or host ownership evidence URL.");
      const channels = await db(`buffer_channels?owner_user_id=eq.${owner.id}&channel_id=eq.${encodeURIComponent(channelId)}&select=channel_id,organization_id,connection_id,handle,is_verified,active,provider_disconnected,provider_locked&limit=1`);
      const channel = channels?.[0];
      if (!channel || !channel.is_verified || !channel.active || channel.provider_disconnected || channel.provider_locked || !channel.connection_id) {
        throw new HttpError(409, "Choose a freshly synchronized channel from your own connected Buffer account.");
      }
      await db("buffer_channel_assignments?on_conflict=connection_id%2Cchannel_id%2Cclient_key", "POST", [{
        owner_user_id: owner.id, connection_id: channel.connection_id, organization_id: channel.organization_id,
        channel_id: channel.channel_id, client_key: model.id, host_id: hostId,
        expected_handle: String(channel.handle || "").replace(/^@/, ""),
        assignment_status: "pending",
        owner_evidence: { source: "owner_scoped_buffer_oauth", owner_user_id: owner.id, model_id: model.id, host_id_attested_by_owner: true, host_evidence_url: hostEvidenceUrl, attested_at: new Date().toISOString(), review_required: true },
        updated_at: new Date().toISOString(),
      }], "resolution=merge-duplicates,return=minimal");
      return res.status(202).json({ ok: true, mapped: false, assignment_status: "pending", channel_id: channelId, organization_id: channel.organization_id, message: "Mapping submitted. Highlights publishing unlocks after Elite verifies the host-to-channel relationship." });
    }
    if (action === "authorize_asset") {
      const assetId = key(body.asset_id, "Highlights asset ID", 80);
      const channelId = key(body.channel_id, "Buffer channel ID");
      const rightsHolder = key(body.rights_holder, "rights holder");
      const evidenceUrl = key(body.rights_evidence_url, "rights evidence URL", 1000);
      if (body.confirm_rights !== true || !/^https:\/\//i.test(evidenceUrl)) throw new HttpError(400, "Confirm that you own or are licensed to publish this media and provide an HTTPS rights-evidence reference.");
      const [assets, channels, assignments, captures] = await Promise.all([
        db(`content_asset_registry?id=eq.${encodeURIComponent(assetId)}&select=id,qa_status,rights_status,commercial_status,origin_review_status,canonical_url,tiktok_eligible,youtube_eligible,google_business_eligible,publish_blockers&limit=1`),
        db(`buffer_channels?owner_user_id=eq.${owner.id}&channel_id=eq.${encodeURIComponent(channelId)}&select=channel_id,organization_id,platform,is_verified,active,publishing_enabled,provider_disconnected,provider_locked&limit=1`),
        db(`buffer_channel_assignments?owner_user_id=eq.${owner.id}&channel_id=eq.${encodeURIComponent(channelId)}&client_key=eq.${model.id}&assignment_status=eq.verified&select=id,host_id&limit=1`),
        db(`resofit_live_highlights?content_asset_id=eq.${encodeURIComponent(assetId)}&select=id,host_id&limit=10`),
      ]);
      const asset = assets?.[0], channel = channels?.[0];
      if (!asset || asset.qa_status !== "approved" || asset.rights_status !== "verified" || asset.commercial_status !== "authorized" || asset.origin_review_status !== "approved" || !asset.canonical_url) {
        throw new HttpError(409, "This capture has not passed the existing asset QA, rights, commercial and origin-review gates.");
      }
      if (asset.publish_blockers && (Array.isArray(asset.publish_blockers) ? asset.publish_blockers.length : Object.keys(asset.publish_blockers).length)) throw new HttpError(409, "This asset has active publishing blockers.");
      if (!channel || !channel.is_verified || !channel.active || channel.provider_disconnected || channel.provider_locked) throw new HttpError(409, "Choose an active channel from your own Buffer account.");
      if (!assignments?.length || !captures?.some((capture: any) => assignments.some((assignment: any) => assignment.host_id === capture.host_id))) throw new HttpError(403, "The capture host must match your verified channel mapping.");
      const eligible: Record<string, string> = { tiktok: "tiktok_eligible", youtube: "youtube_eligible", google_business: "google_business_eligible" };
      if (eligible[channel.platform] && asset[eligible[channel.platform]] !== true) throw new HttpError(409, "This asset is not cleared for the selected platform.");
      await db("buffer_asset_authorizations?on_conflict=asset_registry_id%2Cchannel_id%2Cclient_key", "POST", [{
        owner_user_id: owner.id, asset_registry_id: assetId, client_key: model.id,
        host_id: assignments[0].host_id, channel_id: channelId, organization_id: channel.organization_id,
        rights_holder: rightsHolder, permission_scope: ["organic_social"],
        evidence: { url: evidenceUrl, owner_attestation: true, attested_by: owner.id, attested_at: new Date().toISOString() },
        authorization_status: "approved", approved_by: owner.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }], "resolution=merge-duplicates,return=minimal");
      await db(`buffer_channels?owner_user_id=eq.${owner.id}&channel_id=eq.${encodeURIComponent(channelId)}&is_verified=eq.true&active=eq.true&provider_disconnected=eq.false&provider_locked=eq.false`, "PATCH", { publishing_enabled: true, updated_at: new Date().toISOString() }, "return=minimal");
      return res.status(200).json({ ok: true, authorization_status: "approved", publishing_enabled: true });
    }
    if (action === "submit_media_link") {
      const sourceUrl = key(body.media_url, "media URL", 2000);
      const parsed = new URL(sourceUrl);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new HttpError(400, "Supply a public HTTPS media URL without embedded credentials.");
      const rightsHolder = key(body.rights_holder, "rights holder");
      const evidenceUrl = key(body.rights_evidence_url, "rights evidence URL", 1000);
      if (body.confirm_rights !== true || !/^https:\/\//i.test(evidenceUrl)) throw new HttpError(400, "Confirm media rights and provide an HTTPS evidence reference.");
      const intake = await db("buffer_client_media_intake?on_conflict=owner_user_id%2Csource_url", "POST", [{
        id: randomUUID(), owner_user_id: owner.id, model_id: model.id, source_url: parsed.toString(),
        source_host: parsed.hostname, rights_holder: rightsHolder, rights_evidence_url: evidenceUrl,
        rights_attested_at: new Date().toISOString(), status: "pending", updated_at: new Date().toISOString(),
      }], "resolution=merge-duplicates,return=representation");
      return res.status(202).json({ ok: true, status: "pending_review", intake: intake?.[0] || null, message: "The link is queued for asset ingestion and QA. It cannot publish until review and registry clearance are complete." });
    }
    throw new HttpError(400, "Unknown client publishing workspace action.");
  } catch (error) {
    return fail(res, error);
  }
}
