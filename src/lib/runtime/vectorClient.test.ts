import { describe, expect, it } from "vitest";
import { getVectorRuntimeConfig } from "./vectorClient";

describe("vector runtime config wiring", () => {
  it("resolves red-team vector namespace via runtime helper", () => {
    const cfg = getVectorRuntimeConfig({
      REDTEAM_MODE: "true",
      CI: "true",
      UPSTASH_VECTOR_REST_URL: "https://vector",
      UPSTASH_VECTOR_REST_TOKEN: "token",
    });
    expect(cfg.namespace).toBe("redteam-ci-0000000001");
  });
});
