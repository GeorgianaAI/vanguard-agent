export const approvalLocks = new Map<string, number>();

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  return forwardedFor.split(",")[0]?.trim() || "127.0.0.1";
}

export function acquireLocalApprovalLock(
  locks: Map<string, number>,
  key: string,
  ttlMs: number,
): boolean {
  const now = Date.now();
  const existing = locks.get(key);
  if (typeof existing === "number" && existing > now) return false;

  locks.set(key, now + ttlMs);
  return true;
}

