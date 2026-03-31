import { afterEach, describe, expect, it } from "vitest";
import { createThreadId, getToolCallId, THREAD_STORAGE_KEY } from "./chatHelpers";
import type { ToolPart } from "./types";

describe("THREAD_STORAGE_KEY", () => {
  it("is stable for localStorage contract", () => {
    expect(THREAD_STORAGE_KEY).toBe("vanguard-thread-id");
  });
});

describe("getToolCallId", () => {
  it("returns toolCallId when non-empty", () => {
    const part = { type: "tool-invocation", toolCallId: "tc-1" } as ToolPart;
    expect(getToolCallId(part)).toBe("tc-1");
  });

  it("returns null for missing or empty toolCallId", () => {
    expect(getToolCallId({} as ToolPart)).toBeNull();
    expect(
      getToolCallId({ type: "tool-invocation", toolCallId: "" } as ToolPart),
    ).toBeNull();
    expect(
      getToolCallId({ type: "tool-invocation", toolCallId: "   " } as ToolPart),
    ).toBeNull();
  });
});

describe("createThreadId", () => {
  const prevMode = process.env.NEXT_PUBLIC_REDTEAM_MODE;
  const prevPrefix = process.env.RED_TEAM_THREAD_PREFIX;

  afterEach(() => {
    process.env.NEXT_PUBLIC_REDTEAM_MODE = prevMode;
    process.env.RED_TEAM_THREAD_PREFIX = prevPrefix;
  });

  it("starts with vanguard- by default", () => {
    delete process.env.NEXT_PUBLIC_REDTEAM_MODE;
    delete process.env.RED_TEAM_THREAD_PREFIX;
    const id = createThreadId();
    expect(id.startsWith("vanguard-")).toBe(true);
    expect(id.length).toBeGreaterThan("vanguard-".length);
  });

  it("uses red-team thread prefix when mode is enabled", () => {
    process.env.NEXT_PUBLIC_REDTEAM_MODE = "true";
    process.env.RED_TEAM_THREAD_PREFIX = "redteam-ci";
    const id = createThreadId();
    expect(id.startsWith("redteam-ci-")).toBe(true);
  });
});
