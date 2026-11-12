import { afterEach, describe, expect, it, vi } from "vitest";
import { requireUser } from "../../lib/server/buffer-oauth";

describe("client-owned Buffer session authentication", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects requests without a Bearer token", async () => {
    await expect(requireUser({ headers: {} })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("validates the session with Supabase and returns the authenticated owner", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "user-123", email: "Model@Example.com" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requireUser({ headers: { authorization: "Bearer valid-session-token" } }),
    ).resolves.toEqual({ id: "user-123", email: "model@example.com" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/user",
      {
        headers: {
          apikey: "test-publishable-key",
          authorization: "Bearer valid-session-token",
        },
      },
    );
  });

  it("rejects an invalid Supabase session", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(
      requireUser({ headers: { authorization: "Bearer expired-token" } }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
