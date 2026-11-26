const ANON_KEY = "elite_ng_anonymous_id";
const SESSION_KEY = "elite_ng_session_id";
const ATTR_KEY = "elite_ng_attribution";
const UTM_KEYS = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"] as const;

type Attribution = Partial<Record<(typeof UTM_KEYS)[number] | "rsid", string>>;

function readSessionAttribution(): Attribution {
  try { return JSON.parse(sessionStorage.getItem(ATTR_KEY) || "{}") as Attribution; }
  catch { return {}; }
}
function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export function captureEliteAttribution(search = typeof window !== "undefined" ? window.location.search : ""): void {
  if (typeof window === "undefined") return;
  try {
    if (!localStorage.getItem(ANON_KEY)) localStorage.setItem(ANON_KEY, makeId());
    if (!sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, makeId());
    const params = new URLSearchParams(search);
    const stored = readSessionAttribution();
    const next: Attribution = { ...stored };
    for (const key of UTM_KEYS) {
      const value = params.get(key)?.trim().slice(0, 200);
      if (value) next[key] = value;
    }
    const rsid = params.get("rsid")?.trim().slice(0, 120);
    if (rsid) next.rsid = rsid;
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable; checkout still proceeds without optional attribution.
  }
}
export function getEliteAttributionContext() {
  if (typeof window === "undefined") return {};
  captureEliteAttribution();
  const stored = readSessionAttribution();
  const read = (storage: Storage, key: string) => { try { return storage.getItem(key); } catch { return null; } };
  return {
    anonymous_id: read(localStorage, ANON_KEY),
    session_id: read(sessionStorage, SESSION_KEY),
    rsid: stored.rsid ?? null,
    utm_source: stored.utm_source ?? null,
    utm_medium: stored.utm_medium ?? null,
    utm_campaign: stored.utm_campaign ?? null,
    utm_term: stored.utm_term ?? null,
    utm_content: stored.utm_content ?? null,
    funnel_origin: "elite_ng",
  };
}
