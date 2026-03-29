import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupDomainRdapJson } from "./rdapDomainSummary";

describe("lookupDomainRdapJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns flattened JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          ldhName: "example.com",
          status: ["active"],
          entities: [],
          events: [
            { eventAction: "registration", eventDate: "2020-01-01T00:00:00Z" },
          ],
        }),
      })) as unknown as typeof fetch,
    );

    const out = await lookupDomainRdapJson("Example.COM");
    const parsed = JSON.parse(out) as { domain: string; registrar: string };
    expect(parsed.domain).toBe("example.com");
    expect(parsed.registrar).toBe("unknown");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        text: async () => "not found",
      })) as unknown as typeof fetch,
    );

    await expect(lookupDomainRdapJson("bad.test")).rejects.toThrow(
      "RDAP request failed (404)",
    );
  });
});
