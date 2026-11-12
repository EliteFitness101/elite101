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

export function hostMatchesAsset(hostId: unknown, sourceUrl: unknown): boolean {
  const sourceHostId = hostIdFromBigoUrl(sourceUrl);
  return typeof hostId === "string" && !!sourceHostId && hostId.trim().toLowerCase() === sourceHostId.toLowerCase();
}
