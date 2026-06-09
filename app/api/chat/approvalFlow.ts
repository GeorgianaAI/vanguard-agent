import { HumanMessage } from "@langchain/core/messages";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { createUIMessageStreamResponse } from "ai";
import type { UIMessageChunk } from "ai";
import { vanguardGraph } from "../../../src/lib/agent/graph";
import { shouldRejectApprovalForGraphState } from "./approvalGuards";
import { formatApprovalLockKey } from "./missionRequest";
import { computeApprovalContextHash, isExpiredApproval } from "../../../src/lib/approval/hash";
import { isAllowedApprovalTool, validateApprovalToolArgs } from "../../../src/lib/approval/policy";
import type { ApprovalDecision, ApprovalContextV1 } from "../../../src/lib/approval/types";
import { vanguardChatLog, withRequestIdHeaders } from "./telemetry";
import { acquireLocalApprovalLock, approvalLocks, getClientIp } from "./locks";
import { injectAgentNodeMetadataIntoStream } from "./streaming";
import type { VanguardAgentNode } from "../../../src/lib/agent/agentNode";
import { redis, approvalRatelimit } from "./ratelimit";

type GraphRunConfig = {
  configurable: { thread_id: string };
  version: "v2";
  metadata: Record<string, unknown>;
  tags: string[];
};

export type ApprovalFlowOpts = {
  req: Request;
  reqId: string;
  actorId: string | undefined;
  actorRole: string | undefined;
  threadId: string;
  missionId: string;
  config: GraphRunConfig;
  approved: boolean | undefined;
  tool_call_id: string | undefined;
  approval_id: string | undefined;
  approval_context_hash: string | undefined;
  approval_context: unknown;
  target: string | undefined;
};

export async function handleApprovalRequest(opts: ApprovalFlowOpts): Promise<Response> {
  const {
    req,
    reqId,
    actorId,
    actorRole,
    threadId,
    missionId,
    config,
    approved,
    tool_call_id,
    approval_id,
    approval_context_hash,
    approval_context,
    target,
  } = opts;

  const currentState = await vanguardGraph
    .getState({ configurable: { thread_id: threadId } })
    .catch(() => null);
  const values = (currentState?.values ?? {}) as Record<string, unknown>;
  const pendingApprovalContext = (values.pendingApprovalContext ??
    null) as ApprovalContextV1 | null;
  const pendingApprovalHash = (values.pendingApprovalHash ?? null) as string | null;
  const pendingApprovalId = (values.pendingApprovalId ?? null) as string | null;
  const approvalHistory = Array.isArray(values.approvalHistory)
    ? (values.approvalHistory as ApprovalDecision[])
    : [];

  if (shouldRejectApprovalForGraphState(values)) {
    vanguardChatLog({
      reqId,
      phase: "approval",
      status: 409,
      threadId,
      message: "Stale or invalid checkpoint for approval",
      isApproval: true,
    });
    return withRequestIdHeaders(
      new Response("Approval already processed or no pending authorization step", { status: 409 }),
      reqId,
    );
  }

  if (!approvalRatelimit || !redis) {
    vanguardChatLog({
      reqId,
      phase: "error",
      status: 503,
      threadId,
      message: "Redis config missing for approval flow",
      isApproval: true,
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

  const { success } = await approvalRatelimit.limit(`${getClientIp(req)}:approval`);
  if (!success) {
    vanguardChatLog({
      reqId,
      phase: "rate_limit",
      status: 429,
      threadId,
      message: "Rate limit exceeded",
      isApproval: true,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Too many missions. Cool down.", { status: 429 }),
      reqId,
    );
  }

  const approvalLockKey = formatApprovalLockKey(threadId, tool_call_id);
  const lockTtlMs = 1000 * 60 * 30;

  if (!acquireLocalApprovalLock(approvalLocks, approvalLockKey, lockTtlMs)) {
    vanguardChatLog({
      reqId,
      phase: "approval",
      status: 409,
      threadId,
      message: "Duplicate approval (in-process lock)",
      isApproval: true,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(new Response("Approval already processed", { status: 409 }), reqId);
  }

  const lockSet = await redis.set(approvalLockKey, "1", {
    nx: true,
    ex: 60 * 30,
  });
  if (lockSet !== "OK") {
    vanguardChatLog({
      reqId,
      phase: "approval",
      status: 409,
      threadId,
      message: "Duplicate approval (Redis nx)",
      isApproval: true,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(new Response("Approval already processed", { status: 409 }), reqId);
  }

  let effectivePendingContext = pendingApprovalContext;
  let effectivePendingHash = pendingApprovalHash;
  let effectivePendingId = pendingApprovalId;

  if (!effectivePendingContext || !effectivePendingHash || !effectivePendingId) {
    const fromBody =
      approval_context && typeof approval_context === "object"
        ? (approval_context as ApprovalContextV1)
        : null;
    if (!fromBody) {
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 409,
        threadId,
        message: "Missing pending approval context",
        isApproval: true,
        actorId,
        actorRole,
      });
      return withRequestIdHeaders(
        new Response("Approval context missing or stale", { status: 409 }),
        reqId,
      );
    }
    const computedBodyHash = await computeApprovalContextHash(fromBody);
    if (computedBodyHash !== approval_context_hash) {
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 409,
        threadId,
        message: "Approval context hash mismatch (body)",
        isApproval: true,
        actorId,
        actorRole,
      });
      return withRequestIdHeaders(
        new Response("Approval mismatch — context hash is invalid", {
          status: 409,
        }),
        reqId,
      );
    }
    effectivePendingContext = fromBody;
    effectivePendingHash = computedBodyHash;
    effectivePendingId = fromBody.approval_id;
  }

  if (isExpiredApproval(effectivePendingContext.expires_at)) {
    vanguardChatLog({
      reqId,
      phase: "approval",
      status: 409,
      threadId,
      message: "Approval expired",
      isApproval: true,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Approval expired — please request a fresh authorization", { status: 409 }),
      reqId,
    );
  }

  if (approval_id !== effectivePendingId) {
    vanguardChatLog({
      reqId,
      phase: "approval",
      status: 409,
      threadId,
      message: "Approval id mismatch",
      isApproval: true,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Approval mismatch — plan id does not match pending step", { status: 409 }),
      reqId,
    );
  }

  if (approval_context_hash !== effectivePendingHash) {
    vanguardChatLog({
      reqId,
      phase: "approval",
      status: 409,
      threadId,
      message: "Approval context hash mismatch",
      isApproval: true,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Approval mismatch — context hash is invalid", {
        status: 409,
      }),
      reqId,
    );
  }

  if (tool_call_id && tool_call_id !== effectivePendingContext.approval_id) {
    vanguardChatLog({
      reqId,
      phase: "approval",
      status: 409,
      threadId,
      message: "Approval tool_call_id mismatch",
      isApproval: true,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Approval mismatch — stale tool call id", {
        status: 409,
      }),
      reqId,
    );
  }

  const plannedTool = effectivePendingContext.tool;
  if (
    !isAllowedApprovalTool(plannedTool.name) ||
    !validateApprovalToolArgs(plannedTool.name, plannedTool.args)
  ) {
    vanguardChatLog({
      reqId,
      phase: "approval",
      status: 409,
      threadId,
      message: "Approval tool policy validation failed",
      isApproval: true,
      actorId,
      actorRole,
    });
    return withRequestIdHeaders(
      new Response("Approval blocked — tool policy validation failed", {
        status: 409,
      }),
      reqId,
    );
  }

  const isAuthorized = approved === true;
  const missionAborted = approved === false;
  const safeTarget = target?.trim() || "General Recon";
  const decision: ApprovalDecision = {
    version: 1,
    approval_id: effectivePendingContext.approval_id,
    thread_id: threadId,
    decided_at: new Date().toISOString(),
    decision: isAuthorized ? "authorized" : "aborted",
    tool_name: effectivePendingContext.tool.name,
    tool_arg_hash: effectivePendingContext.tool.arg_hash,
    request_id: reqId,
  };

  await vanguardGraph.updateState(
    { configurable: { thread_id: threadId } },
    {
      isAuthorized,
      isPendingApproval: false,
      missionAborted,
      target: safeTarget,
      next: isAuthorized ? "scout" : "auditor",
      pendingApprovalContext: null,
      pendingApprovalHash: null,
      pendingApprovalId: null,
      approvalHistory: [...approvalHistory, decision].slice(-20),
    },
  );

  const stream = vanguardGraph.streamEvents(
    {
      messages: [
        new HumanMessage(
          isAuthorized
            ? `Authorization granted by operator. Continue exactly one defensive reconnaissance pass for target: ${safeTarget}.`
            : "Authorization denied by operator. Abort external reconnaissance and provide closure.",
        ),
      ],
      target: safeTarget,
      isAuthorized,
      isPendingApproval: false,
      missionAborted,
      next: isAuthorized ? "scout" : "auditor",
    },
    {
      ...config,
      recursionLimit: 10,
      tags: [
        ...config.tags,
        isAuthorized ? "vanguard-agent-approval-authorized" : "vanguard-agent-approval-aborted",
      ],
    },
  );

  vanguardChatLog({
    reqId,
    phase: "approval",
    status: 200,
    threadId,
    missionId,
    message: isAuthorized ? "approval_authorized_stream" : "approval_aborted_stream",
    isApproval: true,
    actorId,
    actorRole,
  });

  const approvalAgentNode: VanguardAgentNode = isAuthorized ? "scout" : "auditor";
  const streamRes = createUIMessageStreamResponse({
    stream: injectAgentNodeMetadataIntoStream(
      toUIMessageStream(stream) as ReadableStream<UIMessageChunk>,
      approvalAgentNode,
    ),
    headers: { "x-vanguard-thread-id": threadId },
  });
  return withRequestIdHeaders(streamRes, reqId);
}
