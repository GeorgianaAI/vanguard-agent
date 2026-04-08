import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEnvTestHarness } from "@/tests/utils/envTestHarness";
import { makeTestRequest } from "@/tests/utils/httpTestRequest";

const hoisted = vi.hoisted(() => ({
  validateCredentials: vi.fn(),
  createSessionToken: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock("../../../../src/lib/auth/config", () => ({
  validateCredentials: hoisted.validateCredentials,
}));

vi.mock("../../../../src/lib/auth/session", () => ({
  createSessionToken: hoisted.createSessionToken,
}));

vi.mock("../../../../src/lib/auth/cookies", () => ({
  setSessionCookie: hoisted.setSessionCookie,
}));

describe("POST /api/auth/login", () => {
  useEnvTestHarness();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    hoisted.createSessionToken.mockResolvedValue("jwt-token");
    hoisted.setSessionCookie.mockResolvedValue(undefined);
  });

  async function loadPost() {
    const { POST } = await import("./route");
    return POST;
  }

  it("returns 400 for invalid body", async () => {
    const POST = await loadPost();
    const res = await POST(
      makeTestRequest("/api/auth/login", {
        body: { username: "ab" }, // invalid body
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 for wrong credentials", async () => {
    hoisted.validateCredentials.mockReturnValue({ ok: false });
    const POST = await loadPost();

    const res = await POST(
      makeTestRequest("/api/auth/login", {
        body: {
          username: "admin",
          password: "WrongPass123",
        },
      }),
    );

    expect(res.status).toBe(401);
    expect(hoisted.createSessionToken).not.toHaveBeenCalled();
    expect(hoisted.setSessionCookie).not.toHaveBeenCalled();
  });

  it("returns 200 for valid credentials", async () => {
    hoisted.validateCredentials.mockReturnValue({ ok: true, role: "admin" });
    const POST = await loadPost();

    const res = await POST(
      makeTestRequest("/api/auth/login", {
        body: {
          username: "admin",
          password: "ChangeMe!123",
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(hoisted.createSessionToken).toHaveBeenCalledWith("admin", "admin");
    expect(hoisted.setSessionCookie).toHaveBeenCalledWith("jwt-token");

    const body = (await res.json()) as { ok: boolean; role: string };
    expect(body.ok).toBe(true);
    expect(body.role).toBe("admin");
  });
});
