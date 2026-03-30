/**
 * Single-line JSON logs for operators and log aggregation (no secrets / full payloads).
 */
export type VanguardChatLog = {
  reqId: string;
  phase: "parse" | "recon" | "approval" | "rate_limit" | "error";
  status: number;
  threadId?: string;
  missionId?: string;
  message: string;
  isApproval?: boolean;
};

export function vanguardChatLog(entry: VanguardChatLog): void {
  console.log(
    JSON.stringify({
      component: "vanguard.api.chat",
      ts: new Date().toISOString(),
      ...entry,
    }),
  );
}

export function newRequestId(req: Request): string {
  return (
    req.headers.get("x-request-id")?.trim() ||
    req.headers.get("cf-ray")?.trim() ||
    crypto.randomUUID()
  );
}

export function withRequestIdHeaders(
  res: Response,
  reqId: string,
): Response {
  const headers = new Headers(res.headers);
  headers.set("x-request-id", reqId);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
