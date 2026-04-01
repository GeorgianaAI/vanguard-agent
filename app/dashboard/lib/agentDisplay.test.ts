import { describe, expect, it } from "vitest";
import type { DashboardMessage } from "./types";
import { resolveDashboardAgentType } from "./agentDisplay";

describe("resolveDashboardAgentType", () => {
  it("prefers metadata.agent_node scout over text that would imply auditor", () => {
    const message = {
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "Final summary with findings and confidence." }],
      metadata: { agent_node: "scout" },
    } as unknown as DashboardMessage;
    expect(resolveDashboardAgentType(message)).toBe("SCOUT");
  });

  it("falls back to heuristic when metadata absent", () => {
    const message = {
      id: "2",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "## Findings\n- a\n## Confidence\nhigh\n## Safe defensive next actions",
        },
      ],
    } as unknown as DashboardMessage;
    expect(resolveDashboardAgentType(message)).toBe("AUDITOR");
  });
});
