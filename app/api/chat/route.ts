import { HumanMessage } from "@langchain/core/messages";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { vanguardGraph } from "../../../src/lib/agent/graph";
import { shouldRejectApprovalForGraphState } from "./approvalGuards";
import {
  approvalMissingContextBinding,
  extractTextFromMessage,
  formatApprovalLockKey,
  MissionRequestSchema,
} from "./missionRequest";
import { isExpiredApproval } from "../../../src/lib/approval/hash";
import {
  isAllowedApprovalTool,
  validateApprovalToolArgs,
} from "../../../src/lib/approval/policy";
import type { ApprovalDecision, ApprovalContextV1 } from "../../../src/lib/approval/types";
import {
  newRequestId,
  vanguardChatLog,
  withRequestIdHeaders,
} from "./telemetry";

export const runtime = "edge";

const redis = Redis.fromEnv();
const approvalLocks = new Map<string, number>();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@vanguard/ratelimit",
});

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  return forwardedFor.split(",")[0]?.trim() || "127.0.0.1";
}

function acquireLocalApprovalLock(key: string, ttlMs: number): boolean {
  const now = Date.now();
  const existing = approvalLocks.get(key);
  if (typeof existing === "number" && existing > now) return false;

  approvalLocks.set(key, now + ttlMs);
  return true;
}

export async function POST(req: Request) {
  const reqId = newRequestId(req);

  try {
    const body = await req.json();
    const parsed = MissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.error("MissionRequestSchema error:", parsed.error.flatten());
      vanguardChatLog({
        reqId,
        phase: "parse",
        status: 400,
        message: "MissionRequestSchema validation failed",
      });
      return withRequestIdHeaders(
        new Response("Invalid mission payload", { status: 400 }),
        reqId,
      );
    }

    const {
      messages,
      target,
      thread_id,
      isApproval,
      approved,
      tool_call_id,
      approval_id,
      approval_context_hash,
    } = parsed.data;

    if (isApproval && !thread_id) {
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 400,
        message: "Missing thread_id for approval",
        isApproval: true,
      });
      return withRequestIdHeaders(
        new Response("Missing thread_id for approval", { status: 400 }),
        reqId,
      );
    }

    if (isApproval && typeof approved !== "boolean") {
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 400,
        threadId: thread_id,
        message: "Missing approved boolean",
        isApproval: true,
      });
      return withRequestIdHeaders(
        new Response("Missing approved boolean for approval request", {
          status: 400,
        }),
        reqId,
      );
    }

    if (approvalMissingContextBinding(parsed.data)) {
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 400,
        threadId: thread_id,
        message: "Missing approval context binding fields",
        isApproval: true,
      });
      return withRequestIdHeaders(
        new Response("Missing approval context binding fields", { status: 400 }),
        reqId,
      );
    }

    const threadId = thread_id ?? `vanguard-${Date.now()}`;

    const { success } = await ratelimit.limit(getClientIp(req));
    if (!success) {
      vanguardChatLog({
        reqId,
        phase: "rate_limit",
        status: 429,
        threadId,
        message: "Rate limit exceeded",
        isApproval: !!isApproval,
      });
      return withRequestIdHeaders(
        new Response("Too many missions. Cool down.", { status: 429 }),
        reqId,
      );
    }

    const config = {
      configurable: { thread_id: threadId },
      version: "v2" as const,
      tags: [
        "vanguard-agent",
        isApproval ? "vanguard-agent-approval" : "vanguard-agent-recon",
      ],
    };

    if (isApproval) {
      const approvalLockKey = formatApprovalLockKey(threadId, tool_call_id);
      const lockTtlMs = 1000 * 60 * 30;

      if (!acquireLocalApprovalLock(approvalLockKey, lockTtlMs)) {
        vanguardChatLog({
          reqId,
          phase: "approval",
          status: 409,
          threadId,
          message: "Duplicate approval (in-process lock)",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Approval already processed", { status: 409 }),
          reqId,
        );
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
        });
        return withRequestIdHeaders(
          new Response("Approval already processed", { status: 409 }),
          reqId,
        );
      }

      const currentState = await vanguardGraph.getState({
        configurable: { thread_id: threadId },
      });
      const values = (currentState?.values ?? {}) as Record<string, unknown>;
      const pendingApprovalContext = (values.pendingApprovalContext ??
        null) as ApprovalContextV1 | null;
      const pendingApprovalHash = (values.pendingApprovalHash ?? null) as
        | string
        | null;
      const pendingApprovalId = (values.pendingApprovalId ?? null) as
        | string
        | null;
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
          new Response(
            "Approval already processed or no pending authorization step",
            { status: 409 },
          ),
          reqId,
        );
      }

      if (!pendingApprovalContext || !pendingApprovalHash || !pendingApprovalId) {
        vanguardChatLog({
          reqId,
          phase: "approval",
          status: 409,
          threadId,
          message: "Missing pending approval context",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Approval context missing or stale", { status: 409 }),
          reqId,
        );
      }

      if (isExpiredApproval(pendingApprovalContext.expires_at)) {
        vanguardChatLog({
          reqId,
          phase: "approval",
          status: 409,
          threadId,
          message: "Approval expired",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Approval expired — please request a fresh authorization", {
            status: 409,
          }),
          reqId,
        );
      }

      if (approval_id !== pendingApprovalId) {
        vanguardChatLog({
          reqId,
          phase: "approval",
          status: 409,
          threadId,
          message: "Approval id mismatch",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Approval mismatch — plan id does not match pending step", {
            status: 409,
          }),
          reqId,
        );
      }

      if (approval_context_hash !== pendingApprovalHash) {
        vanguardChatLog({
          reqId,
          phase: "approval",
          status: 409,
          threadId,
          message: "Approval context hash mismatch",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Approval mismatch — context hash is invalid", {
            status: 409,
          }),
          reqId,
        );
      }

      if (tool_call_id && tool_call_id !== pendingApprovalContext.approval_id) {
        vanguardChatLog({
          reqId,
          phase: "approval",
          status: 409,
          threadId,
          message: "Approval tool_call_id mismatch",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Approval mismatch — stale tool call id", { status: 409 }),
          reqId,
        );
      }

      const plannedTool = pendingApprovalContext.tool;
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
        approval_id: pendingApprovalContext.approval_id,
        thread_id: threadId,
        decided_at: new Date().toISOString(),
        decision: isAuthorized ? "authorized" : "aborted",
        tool_name: pendingApprovalContext.tool.name,
        tool_arg_hash: pendingApprovalContext.tool.arg_hash,
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
          tags: [
            ...config.tags,
            isAuthorized
              ? "vanguard-agent-approval-authorized"
              : "vanguard-agent-approval-aborted",
          ],
        },
      );
      vanguardChatLog({
        reqId,
        phase: "approval",
        status: 200,
        threadId,
        message: isAuthorized
          ? "approval_authorized_stream"
          : "approval_aborted_stream",
        isApproval: true,
      });
      const streamRes = createUIMessageStreamResponse({
        stream: toUIMessageStream(stream),
        headers: { "x-vanguard-thread-id": threadId },
      });
      return withRequestIdHeaders(streamRes, reqId);
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

    vanguardChatLog({
      reqId,
      phase: "recon",
      status: 200,
      threadId,
      message: "recon_stream_start",
      isApproval: false,
    });
    const stream = vanguardGraph.streamEvents(inputState, {
      ...config,
      tags: [...config.tags, "vanguard-agent-recon-start"],
    });

    const streamRes = createUIMessageStreamResponse({
      stream: toUIMessageStream(stream),
      headers: { "x-vanguard-thread-id": threadId },
    });
    return withRequestIdHeaders(streamRes, reqId);
  } catch (error) {
    console.error("Satellite Uplink Error:", error);
    vanguardChatLog({
      reqId,
      phase: "error",
      status: 500,
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return withRequestIdHeaders(
      new Response("Mission Aborted: Uplink Failure", { status: 500 }),
      reqId,
    );
  }
}
