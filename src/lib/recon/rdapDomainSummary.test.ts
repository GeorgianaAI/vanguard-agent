import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupDomainRdapJson } from "./rdapDomainSummary";

function stubFetch(response: object) {
  vi.stubGlobal("fetch", vi.fn(async () => response) as unknown as typeof fetch);
}

function rdapBody(overrides: Record<string, unknown> = {}) {
  return {
    ldhName: "OPENAI.COM",
    status: ["client transfer prohibited"],
    entities: [
      {
        roles: ["registrar"],
        vcardArray: [
          "vcard",
          [
            ["version", {}, "text", "4.0"],
            ["fn", {}, "text", "MarkMonitor Inc."],
          ],
        ],
      },
    ],
    events: [
      { eventAction: "registration", eventDate: "2015-12-11T19:15:20Z" },
      { eventAction: "expiration", eventDate: "2025-12-11T19:15:20Z" },
      { eventAction: "last changed", eventDate: "2023-11-08T09:27:38Z" },
      { eventAction: "last update of RDAP database", eventDate: "2024-01-01T00:00:00Z" },
    ],
    ...overrides,
  };
}

describe("lookupDomainRdapJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns flattened JSON on success", async () => {
    stubFetch({
      ok: true,
      json: async () => ({
        ldhName: "example.com",
        status: ["active"],
        entities: [],
        events: [{ eventAction: "registration", eventDate: "2020-01-01T00:00:00Z" }],
      }),
    });

    const out = await lookupDomainRdapJson("Example.COM");
    const parsed = JSON.parse(out) as { domain: string; registrar: string };
    expect(parsed.domain).toBe("example.com");
    expect(parsed.registrar).toBe("unknown");
  });

  it("throws on non-ok response", async () => {
    stubFetch({ ok: false, status: 404, text: async () => "not found" });

    await expect(lookupDomainRdapJson("bad.test")).rejects.toThrow("RDAP request failed (404)");
  });

  it("extracts registrar name from vcard fn row", async () => {
    stubFetch({ ok: true, json: async () => rdapBody() });

    const result = JSON.parse(await lookupDomainRdapJson("openai.com")) as {
      registrar: string;
    };
    expect(result.registrar).toBe("MarkMonitor Inc.");
  });

  it("normalises domain to lowercase before fetching", async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => rdapBody() }));
    vi.stubGlobal("fetch", spy as unknown as typeof fetch);

    await lookupDomainRdapJson("OPENAI.COM");

    const calledUrl = (spy.mock.calls[0] as unknown as [string])[0];
    expect(calledUrl).toContain("openai.com");
    expect(calledUrl).not.toContain("OPENAI.COM");
  });

  it("filters out non-key event types (last update of RDAP database)", async () => {
    stubFetch({ ok: true, json: async () => rdapBody() });

    const result = JSON.parse(await lookupDomainRdapJson("openai.com")) as {
      events: Array<{ action: string }>;
    };
    const actions = result.events.map((e) => e.action);
    expect(actions).not.toContain("last update of RDAP database");
    expect(actions).toContain("registration");
    expect(actions).toContain("expiration");
    expect(actions).toContain("last changed");
  });

  it("returns unknown registrar when no registrar entity exists", async () => {
    stubFetch({ ok: true, json: async () => rdapBody({ entities: [] }) });

    const result = JSON.parse(await lookupDomainRdapJson("openai.com")) as {
      registrar: string;
    };
    expect(result.registrar).toBe("unknown");
  });

  it("returns unknown registrar when vcard fn row is absent", async () => {
    stubFetch({
      ok: true,
      json: async () =>
        rdapBody({
          entities: [{ roles: ["registrar"], vcardArray: ["vcard", []] }],
        }),
    });

    const result = JSON.parse(await lookupDomainRdapJson("openai.com")) as {
      registrar: string;
    };
    expect(result.registrar).toBe("unknown");
  });

  it("returns empty events array when rdap response has no events", async () => {
    stubFetch({ ok: true, json: async () => rdapBody({ events: [] }) });

    const result = JSON.parse(await lookupDomainRdapJson("openai.com")) as {
      events: unknown[];
    };
    expect(result.events).toEqual([]);
  });

  it("falls back to normalised domain name when ldhName is absent", async () => {
    const body = rdapBody();
    // @ts-expect-error intentionally removing ldhName
    delete body.ldhName;
    stubFetch({ ok: true, json: async () => body });

    const result = JSON.parse(await lookupDomainRdapJson("openai.com")) as { domain: string };
    expect(result.domain).toBe("openai.com");
  });

  it("throws on network-level fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network unreachable");
      }) as unknown as typeof fetch,
    );

    await expect(lookupDomainRdapJson("openai.com")).rejects.toThrow("network unreachable");
  });
});
