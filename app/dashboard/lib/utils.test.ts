import { describe, expect, it } from "vitest";
import type { DashboardMessage } from "./types";
import {
  getMessageSignature,
  isLoadingStatus,
  isReconTool,
  isToolExecuting,
  messageHasApprovalSignal,
  renderMessageText,
} from "./utils";

function msg(
  role: DashboardMessage["role"],
  parts: DashboardMessage["parts"],
): DashboardMessage {
  return { id: "t", role, parts } as DashboardMessage;
}

describe("isLoadingStatus", () => {
  it("returns true for submitted and streaming", () => {
    expect(isLoadingStatus("submitted")).toBe(true);
    expect(isLoadingStatus("streaming")).toBe(true);
    expect(isLoadingStatus("ready")).toBe(false);
  });
});

describe("renderMessageText", () => {
  it("strips AUTHORIZATION_REQUIRED prefix for display", () => {
    const m = msg("assistant", [
      { type: "text", text: "AUTHORIZATION_REQUIRED: Please approve." },
    ]);
    expect(renderMessageText(m)).toBe("Please approve.");
  });

  it("hides legacy [approval] placeholder", () => {
    const m = msg("user", [{ type: "text", text: "[approval]" }]);
    expect(renderMessageText(m)).toBe("");
  });
});

describe("messageHasApprovalSignal", () => {
  it("detects prefix on assistant text", () => {
    const m = msg("assistant", [
      { type: "text", text: "AUTHORIZATION_REQUIRED: Gate" },
    ]);
    expect(messageHasApprovalSignal(m)).toBe(true);
  });

  it("returns false without prefix", () => {
    const m = msg("assistant", [{ type: "text", text: "Hello" }]);
    expect(messageHasApprovalSignal(m)).toBe(false);
  });
});

describe("getMessageSignature", () => {
  it("differs when text differs", () => {
    const a = msg("assistant", [{ type: "text", text: "A" }]);
    const b = msg("assistant", [{ type: "text", text: "B" }]);
    expect(getMessageSignature(a)).not.toBe(getMessageSignature(b));
  });

  it("is stable for same content", () => {
    const a = msg("user", [{ type: "text", text: "Mission authorized" }]);
    const b = msg("user", [{ type: "text", text: "Mission authorized" }]);
    expect(getMessageSignature(a)).toBe(getMessageSignature(b));
  });
});

describe("isReconTool", () => {
  it("matches tavily tools", () => {
    expect(isReconTool("tavily_search")).toBe(true);
    expect(isReconTool("x-tavily-y")).toBe(true);
    expect(isReconTool("domain_whois")).toBe(false);
  });
});

describe("isToolExecuting", () => {
  it("matches streaming states", () => {
    expect(isToolExecuting("input-streaming")).toBe(true);
    expect(isToolExecuting("input-available")).toBe(true);
    expect(isToolExecuting("output-available")).toBe(false);
  });
});
