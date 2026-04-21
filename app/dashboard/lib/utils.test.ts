import { describe, expect, it } from "vitest";
import type { DashboardMessage } from "./types";
import {
  getApprovalContextFromMessage,
  getMessageSignature,
  isLoadingStatus,
  isReconTool,
  isToolExecuting,
  messageHasApprovalSignal,
  parseApprovalContextText,
  renderMessageText,
} from "./utils";

function msg(role: DashboardMessage["role"], parts: DashboardMessage["parts"]): DashboardMessage {
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
  it("renders summary for AUTHORIZATION_REQUIRED context payload", () => {
    const m = msg("assistant", [
      {
        type: "text",
        text: 'AUTHORIZATION_REQUIRED: {"version":1,"approval_id":"apr-1","thread_id":"t","requested_at":"2026-01-01T00:00:00.000Z","expires_at":"2099-01-01T00:00:00.000Z","requested_by_node":"scout","summary":"Need WHOIS.","risk_level":"low","side_effects":"read_only_public_data","policy_tags":["public-data"],"tool":{"name":"domain_whois","args":{"domain":"openai.com"},"args_display":{"domain":"openai.com"},"arg_hash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},"expected_output":["registrar"],"constraints":{"allowed_tools":["domain_whois"],"target_lock":"openai.com"},"prior_approvals_in_thread":0,"changes_since_last":["First authorization in this thread."]}',
      },
    ]);
    expect(renderMessageText(m)).toBe("Manual authorization required: Need WHOIS.");
  });

  it("hides legacy [approval] placeholder", () => {
    const m = msg("user", [{ type: "text", text: "[approval]" }]);
    expect(renderMessageText(m)).toBe("");
  });
});

describe("messageHasApprovalSignal", () => {
  it("detects prefix on assistant text", () => {
    const m = msg("assistant", [{ type: "text", text: "AUTHORIZATION_REQUIRED: Gate" }]);
    expect(messageHasApprovalSignal(m)).toBe(true);
  });

  it("detects structured approval context payload", () => {
    const m = msg("assistant", [
      {
        type: "text",
        text: 'AUTHORIZATION_REQUIRED: {"version":1,"approval_id":"apr-1","thread_id":"t","requested_at":"2026-01-01T00:00:00.000Z","expires_at":"2099-01-01T00:00:00.000Z","requested_by_node":"scout","summary":"Need WHOIS.","risk_level":"low","side_effects":"read_only_public_data","policy_tags":["public-data"],"tool":{"name":"domain_whois","args":{"domain":"openai.com"},"args_display":{"domain":"openai.com"},"arg_hash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},"expected_output":["registrar"],"constraints":{"allowed_tools":["domain_whois"],"target_lock":"openai.com"},"prior_approvals_in_thread":0,"changes_since_last":["First authorization in this thread."]}',
      },
    ]);
    expect(messageHasApprovalSignal(m)).toBe(true);
    expect(getApprovalContextFromMessage(m)?.approval_id).toBe("apr-1");
  });

  it("returns false without prefix", () => {
    const m = msg("assistant", [{ type: "text", text: "Hello" }]);
    expect(messageHasApprovalSignal(m)).toBe(false);
  });
});

describe("parseApprovalContextText", () => {
  it("parses context payload", () => {
    const parsed = parseApprovalContextText(
      'AUTHORIZATION_REQUIRED: {"version":1,"approval_id":"apr-1","thread_id":"t","requested_at":"2026-01-01T00:00:00.000Z","expires_at":"2099-01-01T00:00:00.000Z","requested_by_node":"scout","summary":"Need WHOIS.","risk_level":"low","side_effects":"read_only_public_data","policy_tags":["public-data"],"tool":{"name":"domain_whois","args":{"domain":"openai.com"},"args_display":{"domain":"openai.com"},"arg_hash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},"expected_output":["registrar"],"constraints":{"allowed_tools":["domain_whois"],"target_lock":"openai.com"},"prior_approvals_in_thread":0,"changes_since_last":["First authorization in this thread."]}',
    );
    expect(parsed?.tool.name).toBe("domain_whois");
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
