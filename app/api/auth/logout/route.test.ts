import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEnvTestHarness } from "@/tests/utils/envTestHarness";

const hoisted = vi.hoisted(() => ({
  clearSessionCookie: vi.fn(),
}));

vi.mock("../../../../src/lib/auth/cookies", () => ({
  clearSessionCookie: hoisted.clearSessionCookie,
}));

describe("POST /api/auth/logout", () => {
  useEnvTestHarness();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    hoisted.clearSessionCookie.mockResolvedValue(undefined);
  });

  it("returns 200 and clears session cookie", async () => {
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(200);
    expect(hoisted.clearSessionCookie).toHaveBeenCalledTimes(1);

    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
