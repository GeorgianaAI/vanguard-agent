import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { attachAgentNode } from "../agent/agentNode";
import { checkpointMessagesToDashboardMessages } from "./checkpointToUIMessages";

describe("checkpointMessagesToDashboardMessages", () => {
  it("preserves agent_node metadata on assistant rows", () => {
    const msgs = [attachAgentNode(new AIMessage("closure summary"), "auditor")];
    const ui = checkpointMessagesToDashboardMessages(msgs);
    expect(ui).toHaveLength(1);
    expect(ui[0].role).toBe("assistant");
    expect(ui[0].metadata?.agent_node).toBe("auditor");
  });

  it("merges tool outputs into assistant tool parts", () => {
    const ai = new AIMessage({
      content: "running tools",
      tool_calls: [
        {
          id: "call_1",
          name: "domain_whois",
          args: { domain: "example.com" },
          type: "tool_call",
        },
      ],
    });
    attachAgentNode(ai, "scout");
    const tool = new ToolMessage({
      content: "{}",
      tool_call_id: "call_1",
    });
    const ui = checkpointMessagesToDashboardMessages([ai, tool]);
    expect(ui).toHaveLength(1);
    const part = ui[0].parts.find((p) => p.type === "dynamic-tool");
    expect(part).toBeDefined();
    if (part && part.type === "dynamic-tool") {
      expect(part.state).toBe("output-available");
      expect(part.toolCallId).toBe("call_1");
    }
  });

  it("maps human messages", () => {
    const ui = checkpointMessagesToDashboardMessages([
      new HumanMessage("scan example.com"),
    ]);
    expect(ui[0].role).toBe("user");
    expect(ui[0].parts[0]).toMatchObject({ type: "text", text: "scan example.com" });
  });
});
