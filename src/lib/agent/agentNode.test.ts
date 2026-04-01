import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import {
  attachAgentNode,
  readAgentNodeFromLangchainMessage,
  VANGUARD_AGENT_NODE_KW,
} from "./agentNode";

describe("agentNode", () => {
  it("reads tagged node from AIMessage", () => {
    const m = attachAgentNode(new AIMessage("hi"), "scout");
    expect(readAgentNodeFromLangchainMessage(m)).toBe("scout");
    expect(m.additional_kwargs?.[VANGUARD_AGENT_NODE_KW]).toBe("scout");
  });

  it("returns undefined for non-AI messages", () => {
    expect(readAgentNodeFromLangchainMessage(new HumanMessage("x"))).toBeUndefined();
  });
});
