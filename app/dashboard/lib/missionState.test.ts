import { describe, expect, it } from "vitest";
import type { DashboardMessage } from "./types";
import {
  extractMissionMessageText,
  hasOpenApproval,
  shouldStartFreshMission,
} from "./missionState";

function assistant(text: string): DashboardMessage {
  return {
    id: "a",
    role: "assistant",
    parts: [{ type: "text", text }],
  } as DashboardMessage;
}

function user(text: string): DashboardMessage {
  return {
    id: "u",
    role: "user",
    parts: [{ type: "text", text }],
  } as DashboardMessage;
}

describe("extractMissionMessageText", () => {
  it("lowercases combined text parts", () => {
    const m = assistant("AUTHORIZATION_REQUIRED: X");
    expect(extractMissionMessageText(m)).toContain("authorization_required:");
  });
});

describe("hasOpenApproval", () => {
  it("is true when last assistant has signal and no resolution user message", () => {
    const messages = [assistant("AUTHORIZATION_REQUIRED: Approve me")];
    expect(hasOpenApproval(messages)).toBe(true);
  });

  it("is false after mission authorized user message", () => {
    const messages = [
      assistant("AUTHORIZATION_REQUIRED: Approve me"),
      user("Mission authorized"),
    ];
    expect(hasOpenApproval(messages)).toBe(false);
  });

  it("is false after mission aborted user message", () => {
    const messages = [
      assistant("AUTHORIZATION_REQUIRED: Approve me"),
      user("Mission aborted"),
    ];
    expect(hasOpenApproval(messages)).toBe(false);
  });

  it("is true when approval-requested tool part exists without resolution", () => {
    const messages = [
      {
        id: "1",
        role: "assistant" as const,
        parts: [
          {
            type: "tool-invocation",
            state: "approval-requested",
            toolCallId: "manual-authorization",
          },
        ],
      } as DashboardMessage,
    ];
    expect(hasOpenApproval(messages)).toBe(true);
  });
});

describe("shouldStartFreshMission", () => {
  it("is false for empty messages", () => {
    expect(shouldStartFreshMission([])).toBe(false);
  });

  it("is false when approval is open", () => {
    expect(
      shouldStartFreshMission([assistant("AUTHORIZATION_REQUIRED: wait")]),
    ).toBe(false);
  });

  it("is true when messages exist and approval is closed", () => {
    expect(
      shouldStartFreshMission([
        assistant("Done"),
        user("Mission authorized"),
      ]),
    ).toBe(true);
  });
});
