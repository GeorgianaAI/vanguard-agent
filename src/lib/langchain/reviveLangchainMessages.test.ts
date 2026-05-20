import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { reviveLangchainMessages } from "./reviveLangchainMessages";

describe("reviveLangchainMessages", () => {
  it("returns empty array for empty input", () => {
    expect(reviveLangchainMessages([])).toEqual([]);
  });

  it("passes through already-instantiated BaseMessage instances", () => {
    const msgs = [new HumanMessage("hello"), new AIMessage("hi")];
    const result = reviveLangchainMessages(msgs);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(HumanMessage);
    expect(result[1]).toBeInstanceOf(AIMessage);
  });

  it("revives stored-message shape (type + data)", () => {
    const stored = [
      { type: "human", data: { content: "what is the registrar for openai.com?" } },
      { type: "ai", data: { content: "I will call domain_whois." } },
    ];

    const result = reviveLangchainMessages(stored as unknown[]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(HumanMessage);
    expect(result[1]).toBeInstanceOf(AIMessage);
  });

  it("revives serialized constructor shape (lc: 1)", () => {
    const serialized = [
      {
        lc: 1,
        type: "constructor",
        id: ["langchain_core", "messages", "HumanMessage"],
        kwargs: { content: "run domain_whois" },
      },
    ];

    const result = reviveLangchainMessages(serialized as unknown[]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(HumanMessage);
    expect(result[0].content).toBe("run domain_whois");
  });

  it("skips null or non-object entries without throwing", () => {
    const mixed = [
      new HumanMessage("valid"),
      null,
      undefined,
      42,
    ];

    const result = reviveLangchainMessages(mixed as unknown[]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(HumanMessage);
  });

  it("preserves ToolMessage content and tool_call_id on passthrough", () => {
    const tm = new ToolMessage({ content: "rdap result", tool_call_id: "call-1" });
    const result = reviveLangchainMessages([tm]);
    expect(result[0]).toBeInstanceOf(ToolMessage);
    expect((result[0] as ToolMessage).tool_call_id).toBe("call-1");
  });
});
