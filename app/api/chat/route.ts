import { HumanMessage } from "@langchain/core/messages";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { vanguardGraph } from "../../../src/lib/agent/graph";
import { shouldRejectApprovalForGraphState } from "./approvalGuards";
import {
  extractTextFromMessage,
  formatApprovalLockKey,
  MissionRequestSchema,
} from "./missionRequest";
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

    const { messages, target, thread_id, isApproval, approved, tool_call_id } =
      parsed.data;

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

      const isAuthorized = approved === true;
      const missionAborted = approved === false;
      const safeTarget = target?.trim() || "General Recon";
      await vanguardGraph.updateState(
        { configurable: { thread_id: threadId } },
        {
          isAuthorized,
          isPendingApproval: false,
          missionAborted,
          target: safeTarget,
          next: isAuthorized ? "scout" : "auditor",
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
        message: isAuthorized ? "approval_authorized_stream" : "approval_aborted_stream",
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
