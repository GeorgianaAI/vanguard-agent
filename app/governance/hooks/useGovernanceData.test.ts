import { describe, expect, it } from "vitest";

import { getThreadIdFromStorage } from "./useGovernanceData";

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

