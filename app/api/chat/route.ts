import { AIMessage, HumanMessage } from "@langchain/core/messages";
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
import {
  computeApprovalContextHash,
  isExpiredApproval,
} from "../../../src/lib/approval/hash";
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
import type { UIMessageChunk } from "ai";
import {
  getThreadPrefix,
  isRedTeamMode,
  resolveRedisEnv,
} from "../../../src/lib/runtime/redteam";
import { getVectorRuntimeConfig } from "../../../src/lib/runtime/vectorClient";

export const runtime = "edge";

const redisEnv = resolveRedisEnv();
const vectorEnv = getVectorRuntimeConfig();
const redis = redisEnv.url && redisEnv.token
  ? new Redis({ url: redisEnv.url, token: redisEnv.token })
  : null;
const approvalLocks = new Map<string, number>();

const MISSION_RATE_LIMIT_WINDOW = "60 s";
const MISSION_RATE_LIMIT_REQUESTS = 5;
const APPROVAL_RATE_LIMIT_WINDOW = "60 s";
const APPROVAL_RATE_LIMIT_REQUESTS = 20;

const missionRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        MISSION_RATE_LIMIT_REQUESTS,
        MISSION_RATE_LIMIT_WINDOW,
      ),
      analytics: true,
      prefix: `@${redisEnv.keyPrefix}/ratelimit/mission`,
    })
  : null;

const approvalRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        APPROVAL_RATE_LIMIT_REQUESTS,
        APPROVAL_RATE_LIMIT_WINDOW,
      ),
      analytics: true,
      prefix: `@${redisEnv.keyPrefix}/ratelimit/approval`,
    })
  : null;

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

function streamSingleAssistantText(text: string): ReadableStream<UIMessageChunk> {
  const textId = `txt_${crypto.randomUUID()}`;
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      controller.enqueue({ type: "start" });
      controller.enqueue({ type: "text-start", id: textId });
      controller.enqueue({ type: "text-delta", id: textId, delta: text });
      controller.enqueue({ type: "text-end", id: textId });
      controller.enqueue({ type: "finish", finishReason: "stop" });
      controller.close();
    },
  });
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
      approval_context,
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

    const threadId = thread_id ?? `${getThreadPrefix()}-${Date.now()}`;
    const missionId = threadId;

    // Fast-fail tampered approval payloads before touching external dependencies.
    if (isApproval && approval_context && typeof approval_context === "object") {
      const bodyContext = approval_context as ApprovalContextV1;
      const computedBodyHash = await computeApprovalContextHash(bodyContext);
      if (computedBodyHash !== approval_context_hash) {
        vanguardChatLog({
          reqId,
          phase: "approval",
          status: 409,
          threadId,
          message: "Approval context hash mismatch (early body check)",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Approval mismatch — context hash is invalid", {
            status: 409,
          }),
          reqId,
        );
      }
    }

    const config = {
      configurable: { thread_id: threadId },
      version: "v2" as const,
      metadata: {
        thread_id: threadId,
        mission_id: missionId,
        request_id: reqId,
        is_approval: !!isApproval,
        vector_namespace: vectorEnv.namespace,
      },
      tags: [
        "vanguard-agent",
        isApproval ? "vanguard-agent-approval" : "vanguard-agent-recon",
        ...(isRedTeamMode() ? ["vanguard-agent-redteam"] : []),
      ],
    };

    if (isApproval) {
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

      // Reject stale/bypass approval attempts before lock/rate-limit dependencies.
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

      if (!approvalRatelimit || !redis) {
        vanguardChatLog({
          reqId,
          phase: "error",
          status: 503,
          threadId,
          message: "Redis config missing for approval flow",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Service unavailable: Redis configuration missing", {
            status: 503,
          }),
          reqId,
        );
      }

      const { success } = await approvalRatelimit.limit(
        `${getClientIp(req)}:approval`,
      );
      if (!success) {
        vanguardChatLog({
          reqId,
          phase: "rate_limit",
          status: 429,
          threadId,
          message: "Rate limit exceeded",
          isApproval: true,
        });
        return withRequestIdHeaders(
          new Response("Too many missions. Cool down.", { status: 429 }),
          reqId,
        );
      }

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
        });
        return withRequestIdHeaders(
          new Response("Approval expired — please request a fresh authorization", {
            status: 409,
          }),
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
        });
        return withRequestIdHeaders(
          new Response("Approval mismatch — plan id does not match pending step", {
            status: 409,
          }),
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
        });
        return withRequestIdHeaders(
          new Response("Approval mismatch — stale tool call id", { status: 409 }),
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
        missionId,
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

    if (!missionRatelimit) {
      vanguardChatLog({
        reqId,
        phase: "error",
        status: 503,
        threadId,
        message: "Redis config missing for mission flow",
        isApproval: false,
      });
      return withRequestIdHeaders(
        new Response("Service unavailable: Redis configuration missing", {
          status: 503,
        }),
        reqId,
      );
    }

    const { success } = await missionRatelimit.limit(`${getClientIp(req)}:mission`);
    if (!success) {
      vanguardChatLog({
        reqId,
        phase: "rate_limit",
        status: 429,
        threadId,
        message: "Rate limit exceeded",
        isApproval: false,
      });
      return withRequestIdHeaders(
        new Response("Too many missions. Cool down.", { status: 429 }),
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

    vanguardChatLog({
      reqId,
      phase: "recon",
      status: 200,
      threadId,
      missionId,
      message: "recon_stream_start",
      isApproval: false,
    });
    const nextState = await vanguardGraph.invoke(inputState, {
      ...config,
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

    const streamRes = createUIMessageStreamResponse({
      stream: streamSingleAssistantText(assistantText),
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
