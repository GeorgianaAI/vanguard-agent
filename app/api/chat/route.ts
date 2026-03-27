import { HumanMessage } from "@langchain/core/messages";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { z } from "zod";
import { vanguardGraph } from "../../../src/lib/agent/graph";

export const runtime = "edge";

const IncomingMessageSchema = z.looseObject({
  role: z.string().optional(),
  content: z.unknown().optional(),
  parts: z.array(z.unknown()).optional(),
});

const MissionRequestSchema = z.object({
  messages: z.array(IncomingMessageSchema).optional().default([]),
  target: z.string().optional(),
  thread_id: z.string().optional(),
  isApproval: z.boolean().optional().default(false),
  approved: z.boolean().optional(),
  tool_call_id: z.string().optional(),
});

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@vanguard/ratelimit",
});

function extractTextFromMessage(
  message: z.infer<typeof IncomingMessageSchema>,
): string {
  if (typeof message.content === "string") return message.content.trim();

  if (Array.isArray(message.content)) {
    const fromContent = message.content
      .map((part) => {
        if (
          part &&
          typeof part === "object" &&
          "type" in part &&
          "text" in part &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fromContent) return fromContent;
  }

  if (Array.isArray(message.parts)) {
    const fromParts = message.parts
      .map((part) => {
        if (
          part &&
          typeof part === "object" &&
          "type" in part &&
          "text" in part &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fromParts) return fromParts;
  }

  return "";
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  return forwardedFor.split(",")[0]?.trim() || "127.0.0.1";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = MissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.error("MissionRequestSchema error:", parsed.error.flatten());
      return new Response("Invalid mission payload", { status: 400 });
    }

    const { messages, target, thread_id, isApproval, approved } = parsed.data;

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
      tags: ["vanguard-agent-recon"],
    };

    if (isApproval) {
      const isAuthorized = approved === true;

      await vanguardGraph.updateState(
        { configurable: { thread_id: threadId } },
        {
          isAuthorized,
          isPendingApproval: false,
        },
      );

      const resumeState = {
        messages: [
          new HumanMessage(
            isAuthorized
              ? "Authorization granted by operator. Continue defensive OSINT."
              : "Authorization denied by operator. Stop external OSINT and provide safe next steps.",
          ),
        ],
        isAuthorized,
        isPendingApproval: false,
        next: "scout",
      };

      const stream = await vanguardGraph.streamEvents(resumeState, config);

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

    const stream = await vanguardGraph.streamEvents(inputState, config);

    return createUIMessageStreamResponse({
      stream: toUIMessageStream(stream),
      headers: { "x-vanguard-thread-id": threadId },
    });
  } catch (error) {
    console.error("Satellite Uplink Error:", error);
    return new Response("Mission Aborted: Uplink Failure", { status: 500 });
  }
}
