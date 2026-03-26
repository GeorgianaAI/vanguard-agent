import { vanguardGraph } from "../../../src/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { z } from "zod";

export const runtime = "edge";

const MissionRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.string().min(1),
      }),
    )
    .min(1),
  target: z.string().optional(),
});

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "@vanguard/ratelimit",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = MissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response("Invalid mission payload", { status: 400 });
    }

    const { messages, target } = parsed.data;

    const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
    const ip = forwardedFor.split(",")[0]?.trim() || "127.0.0.1";

    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return new Response("Too many missions. Cool down.", { status: 429 });
    }

    const lastMessage = messages[messages.length - 1];
    const inputState = {
      messages: [new HumanMessage(lastMessage.content)],
      target: target ?? "General Recon",
    };

    const stream = await vanguardGraph.streamEvents(inputState, {
      version: "v2",
      configurable: { thread_id: `vanguard-${Date.now()}` },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream(stream),
    });
  } catch (error) {
    console.error("Satellite Uplink Error:", error);
    return new Response("Mission Aborted: Uplink Failure", { status: 500 });
  }
}
