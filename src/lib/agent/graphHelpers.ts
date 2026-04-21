import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { computeApprovalContextHash, computeArgHash } from "../approval/hash";
import {
  APPROVAL_TOOL_ALLOWLIST,
  getApprovalRisk,
  getApprovalSideEffects,
} from "../approval/policy";
import type { ApprovalContextV1 } from "../approval/types";
import { lookupDomainRdapJson } from "../recon/rdapDomainSummary";
import type { VanguardStateType } from "./state";

export const APPROVAL_TTL_MS = 1000 * 60 * 10;
export const APPROVAL_SIGNAL_PREFIX = "AUTHORIZATION_REQUIRED:";

export function ensureEndsWithUser(messages: VanguardStateType["messages"], fallback: string) {
  const prepared = [...messages];
  const last = prepared[prepared.length - 1];
  if (!last || !HumanMessage.isInstance(last)) {
    prepared.push(new HumanMessage(fallback));
  }
  return prepared;
}

export function normalizeTargetToDomain(target: string): string {
  const trimmed = target.trim().toLowerCase();
  if (!trimmed) return "example.com";
  const withoutScheme = trimmed.replace(/^https?:\/\//, "");
  const host = withoutScheme.split("/")[0] || "example.com";
  // Remove trailing punctuation users commonly type in prompts/inputs.
  const cleaned = host.replace(/[.,;:!?]+$/g, "");
  return cleaned || "example.com";
}

function isUnresolvableTargetError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("rdap request failed (404)") ||
    msg.includes("not found") ||
    msg.includes("no such domain") ||
    msg.includes("nxdomain")
  );
}

export async function runTargetPreflight(domain: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  try {
    // Reuse same data source as domain_whois tool.
    await lookupDomainRdapJson(domain);
    return { ok: true };
  } catch (error) {
    if (isUnresolvableTargetError(error)) {
      return {
        ok: false,
        reason:
          error instanceof Error ? error.message : "Target appears unresolvable in RDAP preflight.",
      };
    }
    // Non-resolution failures (timeouts/network/provider) should not hard-stop mission.
    return { ok: true };
  }
}

export function hasTargetUnresolvableSignal(state: VanguardStateType): boolean {
  return state.messages.some(
    (m) =>
      AIMessage.isInstance(m) &&
      typeof m.content === "string" &&
      m.content.includes("TARGET_UNRESOLVABLE:"),
  );
}

export function diffSinceLastApproval(
  current: { toolName: string; toolArgHash: string; target: string },
  state: VanguardStateType,
): string[] {
  const previous = state.approvalHistory[state.approvalHistory.length - 1];
  if (!previous) return ["First authorization in this thread."];
  const changes: string[] = [];
  if (previous.tool_name !== current.toolName) {
    changes.push(`Tool changed: ${previous.tool_name} -> ${current.toolName}`);
  }
  if (previous.tool_arg_hash !== current.toolArgHash) {
    changes.push("Tool arguments changed from prior approval.");
  }
  const previousTarget = state.pendingApprovalContext?.constraints.target_lock ?? "";
  if (previousTarget && previousTarget !== current.target) {
    changes.push(`Target changed: ${previousTarget} -> ${current.target}`);
  }
  if (changes.length === 0) {
    changes.push("No material changes from prior approved action.");
  }
  return changes;
}

export async function buildApprovalContext(
  state: VanguardStateType,
): Promise<{ context: ApprovalContextV1; contextHash: string }> {
  const now = Date.now();
  const requestedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + APPROVAL_TTL_MS).toISOString();
  const targetDomain = normalizeTargetToDomain(state.target || "example.com");
  const toolName = "domain_whois";
  const toolArgs: Record<string, unknown> = { domain: targetDomain };
  const toolArgHash = await computeArgHash(toolArgs);
  const approvalId = `apr_${crypto.randomUUID()}`;

  const context: ApprovalContextV1 = {
    version: 1,
    approval_id: approvalId,
    thread_id: "pending-thread-binding",
    requested_at: requestedAt,
    expires_at: expiresAt,
    requested_by_node: "scout",
    summary: "Need registrar and registration event data before deeper corroboration.",
    reasoning_excerpt:
      "WHOIS/RDAP data anchors identity and registration timeline before broader web corroboration.",
    risk_level: getApprovalRisk(toolName),
    side_effects: getApprovalSideEffects(toolName),
    policy_tags: ["public-data", "osint", "read-only"],
    budget: {
      estimated_tokens: 1200,
      max_tokens_for_step: 3000,
    },
    tool: {
      name: toolName,
      args: toolArgs,
      args_display: {
        domain: targetDomain,
      },
      arg_hash: toolArgHash,
    },
    expected_output: ["registrar", "status", "registration/expiration events"],
    constraints: {
      allowed_tools: [...APPROVAL_TOOL_ALLOWLIST],
      target_lock: targetDomain,
    },
    prior_approvals_in_thread: state.approvalHistory.length,
    changes_since_last: diffSinceLastApproval(
      { toolName, toolArgHash, target: targetDomain },
      state,
    ),
  };

  const contextHash = await computeApprovalContextHash(context);
  context.approval_context_hash = contextHash;
  return { context, contextHash };
}
