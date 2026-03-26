import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { END, StateGraph } from "@langchain/langgraph";
import { VanguardStateAnnotation, VanguardStateType } from "./state";
import { toolNode, vanguardTools } from "./tools";

export const runtime = "edge";

// 1. Model initialization
const brainModel = new ChatAnthropic({
  model: "claude-3-7-sonnet-20250224",
  temperature: 0,
}).bindTools(vanguardTools);

// 2. Agent node
async function callModel(state: VanguardStateType) {
  const systemPrompt = new SystemMessage(
    "You are Vanguard, an autonomous Security Scout. Your mission is offensive reconnaissance. " +
      "Analyze the target, use tools to gather intel, and be concise. Do not hallucinate capabilities.",
  );

  const response = await brainModel.invoke([systemPrompt, ...state.messages]);

  return {
    messages: [response],
    iterationCount: 1,
  };
}

// 3. Router
function shouldContinue(state: VanguardStateType) {
  if (state.iterationCount > 10) return END; // Circuit breaker

  const lastMessage = state.messages[state.messages.length - 1];
  if (
    lastMessage &&
    AIMessage.isInstance(lastMessage) &&
    (lastMessage.tool_calls?.length ?? 0) > 0
  ) {
    return "tools";
  }

  return END;
}

// 4. Graph assembly
export const vanguardGraph = new StateGraph(VanguardStateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent")
  .compile();
