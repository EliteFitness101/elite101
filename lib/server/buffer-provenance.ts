export function hostIdFromBigoUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (!/(^|\.)bigo\.tv$/i.test(url.hostname)) return null;
    const pathId = url.pathname.split("/").filter(Boolean).filter((part) => part !== "sid").at(-1);
    const queryId = url.searchParams.get("h");
    const candidate = queryId || pathId;
    return candidate && /^[a-z0-9_-]{3,80}$/i.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function hostMatchesAsset(hostId: unknown, sourceUrl: unknown, sourceAssetId?: unknown): boolean {
  if (typeof hostId !== "string" || !hostId.trim()) return false;
  const fromUrl = hostIdFromBigoUrl(sourceUrl);
  const fromAssetId = typeof sourceAssetId === "string" ? sourceAssetId.trim().split(":", 1)[0] : null;
  const assetHostId = fromAssetId && /^[a-z0-9_-]{3,80}$/i.test(fromAssetId) ? fromAssetId : null;
  const evidenceHost = assetHostId || fromUrl;
  if (!evidenceHost || evidenceHost.toLowerCase() !== hostId.trim().toLowerCase()) return false;
  return !fromUrl || fromUrl.toLowerCase() === hostId.trim().toLowerCase();
}
