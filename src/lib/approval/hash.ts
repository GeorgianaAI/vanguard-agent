import type { ApprovalContextV1 } from "./types";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`)
    .join(",")}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeArgHash(
  args: Record<string, unknown>,
): Promise<string> {
  return `sha256:${await sha256Hex(stableStringify(args))}`;
}

export async function computeApprovalContextHash(
  ctx: ApprovalContextV1,
): Promise<string> {
  const bind = {
    version: ctx.version,
    approval_id: ctx.approval_id,
    thread_id: ctx.thread_id,
    expires_at: ctx.expires_at,
    tool_name: ctx.tool.name,
    tool_args: ctx.tool.args,
    tool_arg_hash: ctx.tool.arg_hash,
    risk_level: ctx.risk_level,
    side_effects: ctx.side_effects,
    policy_tags: [...ctx.policy_tags].sort(),
    allowed_tools: [...ctx.constraints.allowed_tools].sort(),
    target_lock: ctx.constraints.target_lock,
  };
  return `sha256:${await sha256Hex(stableStringify(bind))}`;
}

export function isExpiredApproval(isoDate: string, now = Date.now()): boolean {
  const ts = Date.parse(isoDate);
  return Number.isNaN(ts) || ts <= now;
}
