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
  try {
    const body = await req.json();
    const parsed = MissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.error("MissionRequestSchema error:", parsed.error.flatten());
      return new Response("Invalid mission payload", { status: 400 });
    }

    const { messages, target, thread_id, isApproval, approved, tool_call_id } =
      parsed.data;

    if (isApproval && !thread_id) {
      return new Response("Missing thread_id for approval", { status: 400 });
    }

    const threadId = thread_id ?? `vanguard-${Date.now()}`;

    const { success } = await ratelimit.limit(getClientIp(req));
    if (!success) {
      return new Response("Too many missions. Cool down.", { status: 429 });
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
      if (typeof approved !== "boolean") {
        return new Response("Missing approved boolean for approval request", {
          status: 400,
        });
      }

      const approvalLockKey = formatApprovalLockKey(threadId, tool_call_id);
      const lockTtlMs = 1000 * 60 * 30;

      if (!acquireLocalApprovalLock(approvalLockKey, lockTtlMs)) {
        return new Response("Approval already processed", { status: 409 });
      }

      const lockSet = await redis.set(approvalLockKey, "1", {
        nx: true,
        ex: 60 * 30,
      });
      if (lockSet !== "OK") {
        return new Response("Approval already processed", { status: 409 });
      }

      const currentState = await vanguardGraph.getState({
        configurable: { thread_id: threadId },
      });
      const values = (currentState?.values ?? {}) as Record<string, unknown>;

      if (shouldRejectApprovalForGraphState(values)) {
        return new Response(
          "Approval already processed or no pending authorization step",
          { status: 409 },
        );
      }

      const isAuthorized = approved === true;
      const missionAborted = approved === false;
      const safeTarget = target?.trim() || "General Recon";
      // 1. Patch checkpoint with the operator's decision
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
      // 2. Resume: routeFromStart reads isAuthorized/missionAborted and
      //    routes directly to scout (authorize) or auditor (abort).
      //    Supervisor is bypassed entirely — no second SCOUT token.
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
      return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream),
        headers: { "x-vanguard-thread-id": threadId },
      });
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

    const stream = vanguardGraph.streamEvents(inputState, {
      ...config,
      tags: [...config.tags, "vanguard-agent-recon-start"],
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream(stream),
      headers: { "x-vanguard-thread-id": threadId },
    });
  } catch (error) {
    console.error("Satellite Uplink Error:", error);
    return new Response("Mission Aborted: Uplink Failure", { status: 500 });
  }
}
