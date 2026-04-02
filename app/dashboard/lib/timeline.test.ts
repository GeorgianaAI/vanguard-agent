import { describe, expect, it } from "vitest";
import { buildMissionTimelineEvents } from "./timeline";
import type { DashboardMessage } from "./types";

function asMessage(input: Partial<DashboardMessage>): DashboardMessage {
  return {
    id: input.id ?? "message-id",
    role: input.role ?? "assistant",
    parts: input.parts ?? [],
    metadata: input.metadata,
  } as DashboardMessage;
}

describe("buildMissionTimelineEvents", () => {
  it("uses metadata.agent_node for assistant node classification", () => {
    const messages = [
      asMessage({
        id: "m1",
        role: "assistant",
        metadata: { agent_node: "supervisor" },
        parts: [{ type: "text", text: "Routing mission now." }],
      }),
      asMessage({
        id: "m2",
        role: "assistant",
        metadata: { agent_node: "auditor" },
        parts: [{ type: "text", text: "Brief closure response." }],
      }),
    ];

    const events = buildMissionTimelineEvents(messages, null);
    expect(events[0]?.node).toBe("SUPERVISOR");
    expect(events[1]?.node).toBe("AUDITOR");
  });

  it("keeps operator event labels unchanged", () => {
    const messages = [
      asMessage({
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Mission aborted" }],
      }),
    ];

    const events = buildMissionTimelineEvents(messages, null);
    expect(events[0]?.node).toBe("OPERATOR");
    expect(events[0]?.label).toBe("Aborted by Operator");
  });

  it("falls back when metadata is absent", () => {
    const messages = [
      asMessage({
        id: "m1",
        role: "assistant",
        parts: [{ type: "text", text: "Final summary and findings." }],
      }),
    ];

    const events = buildMissionTimelineEvents(messages, null);
    expect(events[0]?.node).toBe("AUDITOR");
    expect(events[0]?.label).toBe("Final Auditor Summary");
  });
});
