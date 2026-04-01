import { AIMessage, type BaseMessage } from "@langchain/core/messages";

/** LangChain `additional_kwargs` key — stable for checkpoint + history export. */
export const VANGUARD_AGENT_NODE_KW = "vanguard_agent_node" as const;

export type VanguardAgentNode = "supervisor" | "scout" | "auditor";

export function isVanguardAgentNode(v: unknown): v is VanguardAgentNode {
  return v === "supervisor" || v === "scout" || v === "auditor";
}

export function readAgentNodeFromLangchainMessage(
  msg: BaseMessage,
): VanguardAgentNode | undefined {
  if (!AIMessage.isInstance(msg)) return undefined;
  const raw = (msg.additional_kwargs as Record<string, unknown> | undefined)?.[
    VANGUARD_AGENT_NODE_KW
  ];
  return isVanguardAgentNode(raw) ? raw : undefined;
}

/** Attach node tag for checkpoint round-trip + `/api/chat/history` UX metadata. */
export function attachAgentNode<T extends AIMessage>(message: T, node: VanguardAgentNode): T {
  message.additional_kwargs = {
    ...(message.additional_kwargs as Record<string, unknown> | undefined),
    [VANGUARD_AGENT_NODE_KW]: node,
  };
  return message;
}
