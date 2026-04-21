import { describe, expect, it } from "vitest";

import { deriveGovernanceLoadPhase, getThreadIdFromStorage } from "./useGovernanceData";

describe("getThreadIdFromStorage", () => {
  it("returns null when storage is missing", () => {
    expect(getThreadIdFromStorage(null)).toBeNull();
  });

  it("returns null when key is absent", () => {
    const storage = {
      getItem: () => null,
    };
    expect(getThreadIdFromStorage(storage)).toBeNull();
  });

  it("returns null when value is blank", () => {
    const storage = {
      getItem: () => "  ",
    };
    expect(getThreadIdFromStorage(storage)).toBeNull();
  });

  it("returns thread id when present", () => {
    const storage = {
      getItem: () => "vanguard-thread-123",
    };
    expect(getThreadIdFromStorage(storage)).toBe("vanguard-thread-123");
  });
});

describe("deriveGovernanceLoadPhase", () => {
  it("is synchronizing before client mount", () => {
    expect(deriveGovernanceLoadPhase(false, null, false)).toBe("synchronizing");
    expect(deriveGovernanceLoadPhase(false, "t-1", false)).toBe("synchronizing");
  });

  it("is no-session when mounted with no thread id", () => {
    expect(deriveGovernanceLoadPhase(true, null, false)).toBe("no-session");
    expect(deriveGovernanceLoadPhase(true, null, true)).toBe("no-session");
  });

  it("is synchronizing when thread id exists but fetch has not settled", () => {
    expect(deriveGovernanceLoadPhase(true, "t-1", false)).toBe("synchronizing");
  });

  it("is ready only after fetch settles with a thread id", () => {
    expect(deriveGovernanceLoadPhase(true, "t-1", true)).toBe("ready");
  });
});
