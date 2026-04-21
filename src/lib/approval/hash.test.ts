import { describe, expect, it } from "vitest";
import { computeApprovalContextHash, isExpiredApproval, stableStringify } from "./hash";
import type { ApprovalContextV1 } from "./types";

const baseContext: ApprovalContextV1 = {
  version: 1,
  approval_id: "apr-1",
  thread_id: "thread-1",
  requested_at: "2026-03-30T00:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z",
  requested_by_node: "scout",
  summary: "Need RDAP metadata",
  risk_level: "low",
  side_effects: "read_only_public_data",
  policy_tags: ["public-data"],
  tool: {
    name: "domain_whois",
    args: { domain: "openai.com" },
    args_display: { domain: "openai.com" },
    arg_hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  expected_output: ["registrar"],
  constraints: {
    allowed_tools: ["domain_whois", "tavily_search"],
    target_lock: "openai.com",
  },
  prior_approvals_in_thread: 0,
  changes_since_last: ["First authorization in this thread."],
};

describe("stableStringify", () => {
  it("produces deterministic object key ordering", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
});

describe("computeApprovalContextHash", () => {
  it("matches for semantically equivalent contexts", async () => {
    const hashA = await computeApprovalContextHash(baseContext);
    const hashB = await computeApprovalContextHash({
      ...baseContext,
      policy_tags: ["public-data"],
    });
    expect(hashA).toBe(hashB);
  });
});

describe("isExpiredApproval", () => {
  it("returns true for past timestamps", () => {
    expect(isExpiredApproval("2000-01-01T00:00:00.000Z")).toBe(true);
  });
});
