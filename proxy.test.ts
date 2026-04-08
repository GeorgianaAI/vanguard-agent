import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { useEnvTestHarness } from "@/tests/utils/envTestHarness";

const hoisted = vi.hoisted(() => ({
  verifySessionToken: vi.fn(),
}));

vi.mock("./src/lib/auth/session", () => ({
  verifySessionToken: hoisted.verifySessionToken,
}));

describe("proxy auth/rbac", () => {
  const { setEnv, unsetEnv } = useEnvTestHarness();

  beforeEach(() => {
    setEnv({ AUTH_COOKIE_NAME: "vanguard_session" });
    unsetEnv("AUTH_E2E_BYPASS");
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadProxy() {
    const mod = await import("./proxy");
    return mod.proxy;
  }

  it("bypasses auth when AUTH_E2E_BYPASS is true", async () => {
    setEnv({ AUTH_E2E_BYPASS: "true" });

    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/dashboard");
    const res = await proxyFn(req);

    expect(res.status).toBe(200);
    expect(hoisted.verifySessionToken).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated user from /dashboard to /login", async () => {
    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/dashboard");
    const res = await proxyFn(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("returns 401 json for unauthenticated API route", async () => {
    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/api/chat");
    const res = await proxyFn(req);

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session token is invalid", async () => {
    hoisted.verifySessionToken.mockResolvedValue(null);

    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "vanguard_session=bad-token" },
    });
    const res = await proxyFn(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("blocks viewer on /api/chat with 403", async () => {
    hoisted.verifySessionToken.mockResolvedValue({
      sub: "viewer1",
      role: "viewer",
      iat: 1,
      exp: 9999999999,
    });

    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/api/chat", {
      headers: { cookie: "vanguard_session=fake-token" },
    });

    const res = await proxyFn(req);
    expect(res.status).toBe(403);
  });

  it("blocks viewer on /api/governance/export/pdf with 403", async () => {
    hoisted.verifySessionToken.mockResolvedValue({
      sub: "viewer1",
      role: "viewer",
      iat: 1,
      exp: 9999999999,
    });

    const proxyFn = await loadProxy();
    const req = new NextRequest(
      "http://localhost/api/governance/export/pdf?thread_id=vanguard-thread-x",
      { headers: { cookie: "vanguard_session=fake-token" } },
    );

    const res = await proxyFn(req);
    expect(res.status).toBe(403);
  });

  it("allows analyst on /api/governance/export/pdf", async () => {
    hoisted.verifySessionToken.mockResolvedValue({
      sub: "analyst1",
      role: "analyst",
      iat: 1,
      exp: 9999999999,
    });

    const proxyFn = await loadProxy();
    const req = new NextRequest(
      "http://localhost/api/governance/export/pdf?thread_id=vanguard-thread-x",
      { headers: { cookie: "vanguard_session=fake-token" } },
    );

    const res = await proxyFn(req);
    expect(res.status).toBe(200);
  });

  it("allows analyst on /api/chat", async () => {
    hoisted.verifySessionToken.mockResolvedValue({
      sub: "analyst1",
      role: "analyst",
      iat: 1,
      exp: 9999999999,
    });

    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/api/chat", {
      headers: { cookie: "vanguard_session=fake-token" },
    });

    const res = await proxyFn(req);
    expect(res.status).toBe(200);
  });

  it("requires admin on /api/audit/evidence", async () => {
    hoisted.verifySessionToken.mockResolvedValue({
      sub: "analyst1",
      role: "analyst",
      iat: 1,
      exp: 9999999999,
    });

    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/api/audit/evidence", {
      headers: { cookie: "vanguard_session=fake-token" },
    });

    const res = await proxyFn(req);
    expect(res.status).toBe(403);
  });

  it("passes through route with no mapped permission when authenticated", async () => {
    hoisted.verifySessionToken.mockResolvedValue({
      sub: "viewer1",
      role: "viewer",
      iat: 1,
      exp: 9999999999,
    });

    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/login", {
      headers: { cookie: "vanguard_session=fake-token" },
    });

    const res = await proxyFn(req);
    expect(res.status).toBe(200);
  });
});
