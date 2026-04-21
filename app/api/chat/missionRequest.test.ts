import { describe, expect, it } from "vitest";
import {
  approvalMissingContextBinding,
  approvalMissingApprovedFlag,
  approvalMissingThreadId,
  extractTextFromMessage,
  formatApprovalLockKey,
  MissionRequestSchema,
} from "./missionRequest";

describe("MissionRequestSchema", () => {
  it("accepts minimal mission body", () => {
    const r = MissionRequestSchema.safeParse({
      messages: [],
      target: "example.com",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.isApproval).toBe(false);
    }
  });

  it("accepts approval payload with thread and approved flag", () => {
    const r = MissionRequestSchema.safeParse({
      isApproval: true,
      approved: true,
      thread_id: "vanguard-1",
      tool_call_id: "manual-authorization",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid top-level shape", () => {
    const r = MissionRequestSchema.safeParse(null);
    expect(r.success).toBe(false);
  });
});

describe("extractTextFromMessage", () => {
  it("reads string content", () => {
    expect(extractTextFromMessage({ content: "  hello  " })).toBe("hello");
  });

  it("reads text parts array", () => {
    expect(
      extractTextFromMessage({
        parts: [{ type: "text", text: "from parts" }],
      }),
    ).toBe("from parts");
  });

  it("returns empty for empty message", () => {
    expect(extractTextFromMessage({})).toBe("");
  });
});

describe("approvalMissingThreadId", () => {
  it("is true when approval without thread_id", () => {
    expect(
      approvalMissingThreadId({
        messages: [],
        isApproval: true,
        approved: true,
      }),
    ).toBe(true);
  });

  it("is false when thread_id present", () => {
    expect(
      approvalMissingThreadId({
        messages: [],
        isApproval: true,
        approved: true,
        thread_id: "v-1",
      }),
    ).toBe(false);
  });
});

describe("formatApprovalLockKey", () => {
  it("uses manual-authorization when tool id missing", () => {
    expect(formatApprovalLockKey("v-1", undefined)).toBe(
      "vanguard:approval:v-1:manual-authorization",
    );
  });

  it("trims tool call id", () => {
    expect(formatApprovalLockKey("v-1", "  tool-a  ")).toBe("vanguard:approval:v-1:tool-a");
  });
});

describe("approvalMissingApprovedFlag", () => {
  it("is true when approved is not boolean", () => {
    expect(
      approvalMissingApprovedFlag({
        messages: [],
        isApproval: true,
        thread_id: "v-1",
      }),
    ).toBe(true);
  });

  it("is false when approved is boolean", () => {
    expect(
      approvalMissingApprovedFlag({
        messages: [],
        isApproval: true,
        thread_id: "v-1",
        approved: false,
      }),
    ).toBe(false);
  });
});

describe("approvalMissingContextBinding", () => {
  it("is true when approval omits approval_id/hash", () => {
    expect(
      approvalMissingContextBinding({
        messages: [],
        isApproval: true,
        approved: true,
        thread_id: "v-1",
      }),
    ).toBe(true);
  });

  it("is false when approval has context binding", () => {
    expect(
      approvalMissingContextBinding({
        messages: [],
        isApproval: true,
        approved: true,
        thread_id: "v-1",
        approval_id: "apr-1",
        approval_context_hash:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    ).toBe(false);
  });
});
