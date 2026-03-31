import { describe, expect, it } from "vitest";
import { isHealthAcceptable } from "./verifyReady";

describe("isHealthAcceptable", () => {
  it("rejects degraded health for production", () => {
    const ok = isHealthAcceptable(
      {
        status: "degraded",
        dependencies: {
          redis: "ok",
          vector: "ok",
          langsmith: "error",
        },
      },
      "production",
    );
    expect(ok).toBe(false);
  });

  it("accepts non-production when critical deps are not error", () => {
    const ok = isHealthAcceptable(
      {
        status: "degraded",
        dependencies: {
          redis: "ok",
          vector: "ok",
          langsmith: "degraded",
        },
      },
      "non-production",
    );
    expect(ok).toBe(true);
  });
});
