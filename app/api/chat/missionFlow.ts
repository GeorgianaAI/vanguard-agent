import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createUIMessageStreamResponse } from "ai";
import type { UIMessageChunk } from "ai";
import { vanguardGraph } from "../../../src/lib/agent/graph";
import { extractTextFromMessage, type MissionRequestInput } from "./missionRequest";
import { vanguardChatLog, withRequestIdHeaders } from "./telemetry";
import { getClientIp } from "./locks";
import { missionRatelimit, missionDailyRatelimit } from "./ratelimit";
import { streamSingleAssistantText } from "./streaming";
import {
  readAgentNodeFromLangchainMessage,
  type VanguardAgentNode,
} from "../../../src/lib/agent/agentNode";
import { isRedTeamMode } from "../../../src/lib/runtime/redteam";
import { runVectorNamespaceProbe } from "../../../src/lib/runtime/vectorClient";
import type { ApprovalContextV1 } from "../../../src/lib/approval/types";

type GraphRunConfig = {
  configurable: { thread_id: string };
  version: "v2";
  metadata: Record<string, unknown>;
  tags: string[];
};

export type MissionFlowOpts = {
  req: Request;
  reqId: string;
  actorId: string | undefined;
  actorRole: string | undefined;
  threadId: string;
  missionId: string;
  config: GraphRunConfig;
  messages: MissionRequestInput["messages"];
  target: string | undefined;
};

export async function handleMissionRequest(opts: MissionFlowOpts): Promise<Response> {
  const { req, reqId, actorId, actorRole, threadId, missionId, config, messages, target } = opts;

  if (!missionRatelimit || !missionDailyRatelimit) {
    vanguardChatLog({
      reqId,
      phase: "error",
      status: 503,
      threadId,
      message: "Redis config missing for mission flow",
      isApproval: false,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Service unavailable: Redis configuration missing", {
        status: 503,
      }),
      reqId,
    );
  }

  const clientIp = getClientIp(req);
  const { success: minuteOk } = await missionRatelimit.limit(`${clientIp}:mission`);
  if (!minuteOk) {
    vanguardChatLog({
      reqId,
      phase: "rate_limit",
      status: 429,
      threadId,
      message: "Rate limit exceeded",
      isApproval: false,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Too many missions. Cool down.", { status: 429 }),
      reqId,
    );
  }

  const { success: dailyOk } = await missionDailyRatelimit.limit(`${clientIp}:mission:day`);
  if (!dailyOk) {
    vanguardChatLog({
      reqId,
      phase: "rate_limit",
      status: 429,
      threadId,
      message: "Daily rate limit exceeded",
      isApproval: false,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Too many missions today. Try again tomorrow.", { status: 429 }),
      reqId,
    );
  }

  const lastMessage = messages[messages.length - 1];
  const lastUserText = lastMessage ? extractTextFromMessage(lastMessage) : "";

  const inputState = {
    messages: lastUserText ? [new HumanMessage(lastUserText)] : [],
    target: target ?? "General Recon",
    next: "supervisor",
    isAuthorized: false,
    isPendingApproval: false,
    pendingApprovalContext: null,
    pendingApprovalHash: null,
    pendingApprovalId: null,
  };

  let vectorProbeVerified = false;
  if (isRedTeamMode()) {
    try {
      const probe = await runVectorNamespaceProbe(threadId);
      vectorProbeVerified = probe.verified;
    } catch (error) {
      vanguardChatLog({
        reqId,
        phase: "error",
        status: 500,
        threadId,
        message: `vector_namespace_probe_failed:${
          error instanceof Error ? error.message : "unknown"
        }`,
        isApproval: false,
        actorId,
        actorRole,
      });
    }
  }

  vanguardChatLog({
    reqId,
    phase: "recon",
    status: 200,
    threadId,
    missionId,
    message: "recon_stream_start",
    isApproval: false,
    actorId,
    actorRole,
  });

  const nextState = await vanguardGraph.invoke(inputState, {
    ...config,
    recursionLimit: 10,
    metadata: {
      ...config.metadata,
      vector_probe_verified: vectorProbeVerified,
    },
    tags: [...config.tags, "vanguard-agent-recon-start"],
  });

  const nextValues = nextState as Record<string, unknown>;
  if (
    nextValues.isPendingApproval === true &&
    nextValues.pendingApprovalContext &&
    typeof nextValues.pendingApprovalHash === "string" &&
    typeof nextValues.pendingApprovalId === "string"
  ) {
    // invoke() can return state without persisting checkpoint transitions in this flow;
    // persist pending-approval binding explicitly so immediate authorize requests don't race stale state.
    await vanguardGraph.updateState(
      { configurable: { thread_id: threadId } },
      {
        isPendingApproval: true,
        pendingApprovalContext: nextValues.pendingApprovalContext as ApprovalContextV1,
        pendingApprovalHash: nextValues.pendingApprovalHash as string,
        pendingApprovalId: nextValues.pendingApprovalId as string,
      },
    );
  }

  const latestAssistant = [...nextState.messages]
    .reverse()
    .find(
      (msg) =>
        AIMessage.isInstance(msg) &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0,
    );

  const assistantText =
    latestAssistant && AIMessage.isInstance(latestAssistant)
      ? String(latestAssistant.content)
      : "Manual authorization is required before external tools can run.";

  const agentNode: VanguardAgentNode | undefined =
    latestAssistant && AIMessage.isInstance(latestAssistant)
      ? readAgentNodeFromLangchainMessage(latestAssistant)
      : undefined;

  const streamRes = createUIMessageStreamResponse({
    stream: streamSingleAssistantText(assistantText, agentNode),
    headers: { "x-vanguard-thread-id": threadId },
  });
  return withRequestIdHeaders(streamRes, reqId);
}
