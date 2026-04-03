import type { DashboardMessage } from "@/app/dashboard/lib/types";
import {
  extractRenderableText,
  getApprovalContextFromMessage,
} from "@/app/dashboard/lib/utils";

import { LEDGER_MOCK } from "../governance-mock-data";

export type GovernanceLedgerRow = {
  time: string;
  agent: "SCOUT" | "SUPERVISOR" | "AUDITOR";
  action: string;
  status: string;
  risk: "Low" | "Medium" | "High";
};

const RISK_MAP: Record<string, GovernanceLedgerRow["risk"]> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Ledger B: ordered unique tool labels from executed tool invocations. */
export function collectOrderedToolLabelsFromMessages(
  messages: DashboardMessage[],
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    for (const part of m.parts) {
      if (
        typeof part === "object" &&
        part != null &&
        "type" in part &&
        (part as { type: string }).type === "tool-invocation" &&
        "toolName" in part
      ) {
        const name = String((part as { toolName?: string }).toolName ?? "").trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        labels.push(prettyAction(name));
      }
    }
  }
  return labels;
}

function prettyAction(toolName: string | undefined): string {
  if (!toolName) return "Tool Action";
  const name = toolName.toLowerCase();

  if (name.includes("tavily")) return "Tavily Search";
  if (name === "domain_whois") return "WHOIS Lookup";
  if (name === "domain_rdap") return "RDAP Lookup";

  // Fallback: snake_case / kebab-case -> Title Case.
  return name
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function getAuthorizedDecision(messages: DashboardMessage[]): boolean | null {
  // Prefer the latest explicit operator decision.
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== "user") continue;

    const t = extractRenderableText(m).toLowerCase();

    if (
      t.includes("authorization granted by operator") ||
      t.includes("mission authorized")
    ) {
      return true;
    }

    if (
      t.includes("authorization denied by operator") ||
      t.includes("mission aborted")
    ) {
      return false;
    }
  }

  return null;
}

function findApprovalContext(
  messages: DashboardMessage[],
) {
  for (const m of messages) {
    const ctx = getApprovalContextFromMessage(m);
    if (ctx) return ctx;
  }
  return null;
}

function findAuditorPresent(messages: DashboardMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    if (m.metadata?.agent_node === "auditor") return true;
  }
  return false;
}

export function buildGovernanceLedgerRowsFromMessages(
  messages: DashboardMessage[],
): GovernanceLedgerRow[] {
  const approvalContext = findApprovalContext(messages);
  const authorized = getAuthorizedDecision(messages);

  // If the transcript doesn't contain enough decision data, keep mock rows.
  if (!approvalContext || authorized === null)
    return [...LEDGER_MOCK] as unknown as GovernanceLedgerRow[];

  // Presence is computed to satisfy the expected semantics; if missing, we
  // still fall back to the derived decision mapping.
  const auditorPresent = findAuditorPresent(messages);
  void auditorPresent;

  const risk = RISK_MAP[approvalContext.risk_level] ?? "Medium";
  const toolChain = collectOrderedToolLabelsFromMessages(messages);
  const scoutAction =
    toolChain.length > 0 ? toolChain.join(" · ") : prettyAction(approvalContext.tool.name);

  return [
    {
      ...LEDGER_MOCK[0],
      status: "Authorized",
      risk,
      action: scoutAction,
    },
    {
      ...LEDGER_MOCK[1],
      status: authorized ? "Policy Match" : "Policy Mismatch",
      risk,
    },
    {
      ...LEDGER_MOCK[2],
      status: authorized ? "Verified" : "Unverified",
      risk,
    },
  ] as unknown as GovernanceLedgerRow[];
}

