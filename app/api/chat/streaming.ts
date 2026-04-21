import type { UIMessageChunk } from "ai";
import type { VanguardAgentNode } from "../../../src/lib/agent/agentNode";

export function streamSingleAssistantText(
  text: string,
  agentNode?: VanguardAgentNode,
): ReadableStream<UIMessageChunk> {
  const textId = `txt_${crypto.randomUUID()}`;
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      controller.enqueue({ type: "start" });
      if (agentNode) {
        controller.enqueue({
          type: "message-metadata",
          messageMetadata: { agent_node: agentNode },
        });
      }
      controller.enqueue({ type: "text-start", id: textId });
      controller.enqueue({ type: "text-delta", id: textId, delta: text });
      controller.enqueue({ type: "text-end", id: textId });
      controller.enqueue({ type: "finish", finishReason: "stop" });
      controller.close();
    },
  });
}

export function injectAgentNodeMetadataIntoStream(
  stream: ReadableStream<UIMessageChunk>,
  agentNode: VanguardAgentNode,
): ReadableStream<UIMessageChunk> {
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      const reader = stream.getReader();
      let inserted = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        const chunkType = (value as { type?: string }).type;

        if (!inserted && chunkType === "start") {
          controller.enqueue(value);
          controller.enqueue({
            type: "message-metadata",
            messageMetadata: { agent_node: agentNode },
          } as unknown as UIMessageChunk);
          inserted = true;
          continue;
        }

        if (!inserted) {
          controller.enqueue({
            type: "message-metadata",
            messageMetadata: { agent_node: agentNode },
          } as unknown as UIMessageChunk);
          inserted = true;
        }

        controller.enqueue(value);
      }

      controller.close();
    },
  });
}
