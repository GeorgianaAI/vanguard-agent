import { describe, expect, it } from "vitest";
import { parseStoredCheckpointPayload } from "./checkpointer";

describe("parseStoredCheckpointPayload", () => {
  it("parses JSON string payloads", () => {
    const payload = {
      checkpoint: { id: "cp-1", v: 4, channel_values: { messages: [] } },
      metadata: {},
    };
    const raw = JSON.stringify(payload);
    const parsed = parseStoredCheckpointPayload(raw);
    expect(parsed?.checkpoint?.id).toBe("cp-1");
  });

  it("accepts already-deserialized objects (Upstash GET)", () => {
    const payload = {
      checkpoint: {
        id: "cp-2",
        v: 4,
        ts: "2026-01-01T00:00:00.000Z",
        channel_values: { messages: [{ lc: 1, type: "constructor" }] },
        channel_versions: {},
        versions_seen: {},
      },
      metadata: { step: 1 },
    };
    const parsed = parseStoredCheckpointPayload(payload);
    expect(parsed?.checkpoint?.id).toBe("cp-2");
    expect(Array.isArray(parsed?.checkpoint?.channel_values?.messages)).toBe(true);
  });

  it("returns undefined for invalid input", () => {
    expect(parseStoredCheckpointPayload(null)).toBeUndefined();
    expect(parseStoredCheckpointPayload(undefined)).toBeUndefined();
    expect(parseStoredCheckpointPayload(42)).toBeUndefined();
    expect(parseStoredCheckpointPayload("not json")).toBeUndefined();
    expect(parseStoredCheckpointPayload({})).toBeUndefined();
    expect(parseStoredCheckpointPayload({ checkpoint: {} })).toBeUndefined();
  });
});
