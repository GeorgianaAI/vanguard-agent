import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  verifySessionToken: vi.fn(),
}));

vi.mock("./src/lib/auth/session", () => ({
  verifySessionToken: hoisted.verifySessionToken,
}));

describe("proxy auth/rbac", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.AUTH_COOKIE_NAME = "vanguard_session";
    delete process.env.AUTH_E2E_BYPASS;
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadProxy() {
    const mod = await import("./proxy");
    return mod.proxy;
  }

  it("redirects unauthenticated user from /dashboard to /login", async () => {
    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/dashboard");
    const res = await proxyFn(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated user from /governance to /login", async () => {
    const proxyFn = await loadProxy();
    const req = new NextRequest("http://localhost/governance");
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
});
