import { Redis } from "@upstash/redis";
import { Index } from "@upstash/vector";

export type ProbeState = "ok" | "error";

export type ProbeResult = {
  state: ProbeState;
  detail?: string;
};

const PROBE_TIMEOUT_MS = 1200;

function sanitizeDetail(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input ?? "unknown");
  return raw.slice(0, 120);
}

async function withTimeout<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_timeout`)), PROBE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function probeRedis(url: string, token: string): Promise<ProbeResult> {
  try {
    const client = new Redis({ url, token });
    await withTimeout("redis_probe", async () => {
      await client.ping();
    });
    return { state: "ok" };
  } catch (error) {
    return { state: "error", detail: sanitizeDetail(error) };
  }
}

export async function probeVector(url: string, token: string): Promise<ProbeResult> {
  try {
    const index = new Index({ url, token });
    await withTimeout("vector_probe", async () => {
      await index.info();
    });
    return { state: "ok" };
  } catch (error) {
    return { state: "error", detail: sanitizeDetail(error) };
  }
}

export async function probeLangSmith(
  endpoint: string,
  apiKey: string,
): Promise<ProbeResult> {
  try {
    await withTimeout("langsmith_probe", async () => {
      const res = await fetch(`${endpoint.replace(/\/$/, "")}/projects?limit=1`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });
      if (!res.ok) {
        throw new Error(`langsmith_status_${res.status}`);
      }
    });
    return { state: "ok" };
  } catch (error) {
    return { state: "error", detail: sanitizeDetail(error) };
  }
}

export async function sendHealthAlert(payload: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.HEALTH_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await withTimeout("health_alert_webhook", async () => {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        component: "vanguard.api.health",
        level: "warn",
        event: "alert_hook_failed",
        detail: sanitizeDetail(error),
      }),
    );
  }
}
