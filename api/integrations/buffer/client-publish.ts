import { createHash } from "node:crypto";
import { HttpError, requireUser, supabaseConfig } from "../../../lib/server/buffer-oauth.js";
import { bufferGraphQL, getConnection, getFreshBufferToken } from "../../../lib/server/buffer-multi.js";
import { hostMatchesAsset } from "../../../lib/server/buffer-provenance.js";

function fail(res: any, error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : "Client publishing request failed.";
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json({ ok: false, error: message });
}
function bodyOf(req: any) { return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
async function db(path: string, method = "GET", body?: unknown, prefer?: string) {
  const { url, serviceRoleKey } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method, headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  if (!response.ok) throw new HttpError(502, "Publishing registry database operation failed.");
  return raw ? JSON.parse(raw) : null;
}
function required(value: unknown, label: string) {
  const result = String(value || "").trim();
  if (!result || result.length > 2200) throw new HttpError(400, `${label} is required.`);
  return result;
}
async function modelFor(ownerId: string) {
  const [roles, models] = await Promise.all([
    db(`user_roles?user_id=eq.${ownerId}&role=eq.model&select=user_id&limit=1`),
    db(`models?user_id=eq.${ownerId}&select=id&limit=1`),
  ]);
  if (!roles?.length || !models?.length) throw new HttpError(403, "A model workspace is required to publish from a client Buffer account.");
  return models[0];
}
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  let publicationId = "";
  try {
    const owner = await requireUser(req);
    const model = await modelFor(owner.id);
    const body = bodyOf(req);
    const assetId = required(body.asset_id, "Asset ID");
    const channelId = required(body.channel_id, "Buffer channel ID");
    const caption = required(body.caption, "Caption");
    if (caption.length > 2200) throw new HttpError(400, "Caption exceeds the 2,200-character limit.");
    if (body.confirm_publish !== true) throw new HttpError(400, "Explicit client content approval is required before adding this post to the Buffer queue.");

    const [assets, channels, assignments, authorizations, captures] = await Promise.all([
      db(`content_asset_registry?id=eq.${encodeURIComponent(assetId)}&select=id,asset_type,mime_type,source_url,canonical_url,qa_status,rights_status,commercial_status,origin_review_status,tiktok_eligible,youtube_eligible,google_business_eligible,publish_blockers&limit=1`),
      db(`buffer_channels?owner_user_id=eq.${owner.id}&channel_id=eq.${encodeURIComponent(channelId)}&select=channel_id,organization_id,connection_id,platform,name,handle,active,is_verified,publishing_enabled,provider_disconnected,provider_locked&limit=1`),
      db(`buffer_channel_assignments?owner_user_id=eq.${owner.id}&channel_id=eq.${encodeURIComponent(channelId)}&client_key=eq.${model.id}&assignment_status=eq.verified&select=id,host_id,expected_handle,organization_id&limit=1`),
      db(`buffer_asset_authorizations?owner_user_id=eq.${owner.id}&asset_registry_id=eq.${encodeURIComponent(assetId)}&channel_id=eq.${encodeURIComponent(channelId)}&client_key=eq.${model.id}&authorization_status=eq.approved&select=id,rights_holder,permission_scope,evidence,expires_at,host_id,organization_id&limit=1`),
      db(`resofit_live_highlights?content_asset_id=eq.${encodeURIComponent(assetId)}&select=id,host_id&limit=10`),
    ]);
    if (!assets?.length) throw new HttpError(404, "Asset was not found in the approved content registry.");
    const asset = assets[0];
    if (asset.qa_status !== "approved" || asset.rights_status !== "verified" || asset.commercial_status !== "authorized" || asset.origin_review_status !== "approved") {
      throw new HttpError(409, "Asset is not cleared by QA, rights, commercial and origin review.");
    }
    if (asset.publish_blockers && (Array.isArray(asset.publish_blockers) ? asset.publish_blockers.length > 0 : Object.keys(asset.publish_blockers).length > 0)) throw new HttpError(409, "Asset has active publishing blockers.");
    if (!channels?.length) throw new HttpError(404, "Target Buffer channel was not found in your connected account.");
    const channel = channels[0];
    if (!channel.is_verified || !channel.active || !channel.publishing_enabled || channel.provider_disconnected || channel.provider_locked) {
      throw new HttpError(409, "Target channel is not verified, connected and enabled for publishing.");
    }
    if (!channel.connection_id) throw new HttpError(409, "Reconnect and sync this Buffer organization before publishing.");
    if (!assignments?.length || !authorizations?.length) throw new HttpError(409, "Your channel mapping and media-rights authorization are required.");
    const assignment = assignments[0], authorization = authorizations[0];
    if (assignment.organization_id !== channel.organization_id || authorization.organization_id !== channel.organization_id) throw new HttpError(409, "Organization metadata does not match the verified channel assignment.");
    if (authorization.expires_at && new Date(authorization.expires_at).getTime() <= Date.now()) throw new HttpError(409, "Media rights authorization has expired.");
    if (!Array.isArray(authorization.permission_scope) || !authorization.permission_scope.includes("organic_social")) throw new HttpError(409, "Media authorization does not include organic social publishing.");
    const hostSources = await db(`bigo_sources?bigo_id=eq.${encodeURIComponent(assignment.host_id)}&select=bigo_id,metadata,active,capture_enabled&limit=1`);
    const hostSource = hostSources?.[0];
    if (!captures?.some((capture: any) => capture.host_id === assignment.host_id) || authorization.host_id !== assignment.host_id || !hostMatchesAsset(assignment.host_id, asset.source_url)) throw new HttpError(403, "The captured asset provenance and authorization must match your verified client/channel host.");
    if (!hostSource?.active || !hostSource.capture_enabled || hostSource.metadata?.resofit_registry_sync?.allowlist_member !== true) throw new HttpError(403, "This BIGO host is not active in the verified-host publication allowlist.");
    if (channel.handle?.replace(/^@/, "").toLowerCase() !== assignment.expected_handle?.replace(/^@/, "").toLowerCase()) throw new HttpError(409, "Channel handle no longer matches your verified assignment.");
    const platformField: Record<string, string> = { tiktok: "tiktok_eligible", youtube: "youtube_eligible", google_business: "google_business_eligible" };
    const eligibilityField = platformField[channel.platform];
    if (eligibilityField && asset[eligibilityField] !== true) throw new HttpError(409, "Asset is not cleared for this publishing platform.");
    const mediaUrl = String(asset.canonical_url || "");
    if (!/^https:\/\//i.test(mediaUrl) || /[?&](?:X-Amz-Signature|signature|token|expires|X-Goog-Signature)=/i.test(mediaUrl)) throw new HttpError(409, "Asset must have a permanent public HTTPS media URL.");
    const mediaCheck = await fetch(mediaUrl, { method: "HEAD", redirect: "follow" });
    if (!mediaCheck.ok) throw new HttpError(409, "Media URL is not publicly reachable by Buffer.");
    const contentType = mediaCheck.headers.get("content-type") || asset.mime_type || "";
    const isVideo = String(asset.asset_type).toLowerCase() === "video" || contentType.toLowerCase().startsWith("video/");
    const isImage = String(asset.asset_type).toLowerCase() === "image" || contentType.toLowerCase().startsWith("image/");
    if (!isVideo && !isImage) throw new HttpError(409, "Only QA-cleared image or video assets can be published.");

    const idempotencyKey = createHash("sha256").update([owner.id, assetId, channelId, model.id, caption].join("|")).digest("hex");
    const existing = await db(`buffer_publications?idempotency_key=eq.${idempotencyKey}&select=id,status,buffer_post_id&limit=1`);
    if (existing?.length) return res.status(200).json({ ok: true, duplicate: true, publication: existing[0] });

    const connection = await getConnection(channel.connection_id, owner.id);
    if (!connection || connection.status !== "connected") throw new HttpError(409, "Your Buffer account is not connected. Reconnect it from your dashboard.");
    const token = await getFreshBufferToken(connection);
    const { url, serviceRoleKey } = supabaseConfig();
    const insertResponse = await fetch(`${url}/rest/v1/buffer_publications`, {
      method: "POST",
      headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        content_id: null, channel_id: channelId, platform: channel.platform, idempotency_key: idempotencyKey,
        status: "dispatching", connection_id: connection.id, organization_id: channel.organization_id,
        asset_registry_id: assetId, client_key: model.id, host_id: assignment.host_id, target_handle: channel.handle,
        rights_snapshot: authorization, qa_snapshot: { qa_status: asset.qa_status, rights_status: asset.rights_status, commercial_status: asset.commercial_status, origin_review_status: asset.origin_review_status, client_approved_by: owner.id, client_approved_at: new Date().toISOString() },
        attempts: 1, updated_at: new Date().toISOString(),
      }),
    });
    const inserted = await insertResponse.json().catch(() => []);
    if (!insertResponse.ok || !Array.isArray(inserted) || !inserted[0]?.id) {
      if (insertResponse.status === 409) throw new HttpError(409, "This asset is already queued or being published to this channel.");
      throw new HttpError(502, "Could not create the publishing audit record.");
    }
    publicationId = inserted[0].id;
    const assetInput = isVideo ? `video: { url: ${JSON.stringify(mediaUrl)} }` : `image: { url: ${JSON.stringify(mediaUrl)} }`;
    const query = `mutation ClientChatB2KQueuePost {
      createPost(input: {
        text: ${JSON.stringify(caption)}
        channelId: ${JSON.stringify(channelId)}
        schedulingType: automatic
        mode: addToQueue
        assets: [{ ${assetInput} }]
      }) { ... on PostActionSuccess { post { id text dueAt status } } ... on MutationError { message } }
    }`;
    let result: any;
    try { result = await bufferGraphQL(token, query); }
    catch (error) {
      await db(`buffer_publications?id=eq.${publicationId}`, "PATCH", { status: "error", error_message: error instanceof Error ? error.message : "Buffer API failed.", updated_at: new Date().toISOString() }, "return=minimal");
      throw error;
    }
    const action = result?.createPost;
    if (!action?.post?.id) {
      const message = String(action?.message || "Buffer did not return a scheduled post ID.");
      await db(`buffer_publications?id=eq.${publicationId}`, "PATCH", { status: "error", error_message: message, response: action || {}, updated_at: new Date().toISOString() }, "return=minimal");
      throw new HttpError(502, message);
    }
    await db(`buffer_publications?id=eq.${publicationId}`, "PATCH", {
      buffer_post_id: action.post.id, scheduled_at: action.post.dueAt || null, status: "scheduled", response: action, updated_at: new Date().toISOString(),
    }, "return=minimal");
    return res.status(200).json({ ok: true, publication_id: publicationId, buffer_post_id: action.post.id, scheduled_at: action.post.dueAt || null, status: "scheduled", delivery: "Buffer queue; posting time follows the channel's configured Buffer schedule." });
  } catch (error) {
    if (publicationId) await db(`buffer_publications?id=eq.${publicationId}`, "PATCH", { status: "error", error_message: error instanceof Error ? error.message : "Publishing failed.", updated_at: new Date().toISOString() }, "return=minimal").catch(() => undefined);
    return fail(res, error);
  }
}
