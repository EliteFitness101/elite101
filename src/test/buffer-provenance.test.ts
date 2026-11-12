import { describe, expect, it } from "vitest";
import { hostIdFromBigoUrl, hostMatchesAsset } from "../../lib/server/buffer-provenance";

describe("BIGO asset provenance", () => {
  it("extracts a host ID from a public BIGO profile URL", () => {
    expect(hostIdFromBigoUrl("https://www.bigo.tv/calderdeo")).toBe("calderdeo");
  });

  it("extracts the host ID from a BIGO SID URL query", () => {
    expect(hostIdFromBigoUrl("https://www.bigo.tv/sid/room?c=0&h=1059003286")).toBe("1059003286");
  });

  it("accepts only an exact host-to-source match", () => {
    expect(hostMatchesAsset("calderdeo", "https://www.bigo.tv/calderdeo")).toBe(true);
    expect(hostMatchesAsset("calderdeo", "https://cdn.example.net/live.m3u8", "calderdeo:20261011T141557Z:source.mp4")).toBe(true);
    expect(hostMatchesAsset("calderdeo", "https://www.bigo.tv/1059003286", "1059003286:20261111T223845Z:asset.mp4")).toBe(false);
    expect(hostMatchesAsset("calderdeo", "https://cdn.example.net/live.m3u8", "1059003286:20261111T223845Z:asset.mp4")).toBe(false);
  });

  it("fails closed for non-BIGO or malformed source URLs", () => {
    expect(hostIdFromBigoUrl("https://example.com/calderdeo")).toBeNull();
    expect(hostMatchesAsset("calderdeo", "not-a-url")).toBe(false);
  });
});
