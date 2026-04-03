import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { attachAgentNode } from "../agent/agentNode";
import { checkpointMessagesToDashboardMessages } from "./checkpointToUIMessages";
import { reviveLangchainMessages } from "@/src/lib/langchain/reviveLangchainMessages";

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

describe("reviveLangchainMessages + checkpointMessagesToDashboardMessages", () => {
  it("rehydrates StoredMessage-shaped plain objects from checkpoint JSON", () => {
    const raw = [
      { type: "human" as const, data: { content: "scan example.com" } },
      {
        type: "ai" as const,
        data: {
          content: "done",
          tool_calls: [
            {
              id: "call_1",
              name: "domain_whois",
              args: { domain: "example.com" },
              type: "tool_call" as const,
            },
          ],
        },
      },
      {
        type: "tool" as const,
        data: { content: "{}", tool_call_id: "call_1" },
      },
    ];
    const ui = checkpointMessagesToDashboardMessages(reviveLangchainMessages(raw));
    expect(ui).toHaveLength(2);
    expect(ui[0].role).toBe("user");
    expect(ui[0].parts[0]).toMatchObject({ type: "text", text: "scan example.com" });
    const toolPart = ui[1].parts.find((p) => p.type === "dynamic-tool");
    expect(toolPart).toBeDefined();
    if (toolPart && toolPart.type === "dynamic-tool") {
      expect(toolPart.toolCallId).toBe("call_1");
      expect(toolPart.state).toBe("output-available");
    }
  });

  it("rehydrates LangChain serialized constructor payloads (lc + kwargs)", () => {
    const raw = [
      {
        lc: 1,
        type: "constructor",
        id: ["langchain", "schema", "messages", "HumanMessage"],
        kwargs: { content: "hello from redis" },
      },
    ];
    const revived = reviveLangchainMessages(raw);
    expect(revived).toHaveLength(1);
    expect(HumanMessage.isInstance(revived[0])).toBe(true);
    const ui = checkpointMessagesToDashboardMessages(revived);
    expect(ui[0].parts[0]).toMatchObject({
      type: "text",
      text: "hello from redis",
    });
  });
});
