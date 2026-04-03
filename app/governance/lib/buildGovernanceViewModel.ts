import type { DashboardMessage } from "@/app/dashboard/lib/types";
import {
  extractRenderableText,
  getApprovalContextFromMessage,
} from "@/app/dashboard/lib/utils";
import type { EvidencePackage } from "@/src/lib/audit/evidence";

import {
  ADVISORY_MOCK,
  EVIDENCE_TRAIL,
  LEDGER_MOCK,
} from "../governance-mock-data";
import {
  buildGovernanceLedgerRowsFromMessages,
  type GovernanceLedgerRow,
} from "./buildGovernanceLedgerRows";

export type GovernanceEvidenceItem = {
  label: string;
  desc: string;
  id: string;
};

export type GovernanceMetricCard = {
  mode: string;
  label: string;
  value: string;
  percent: number;
};

export type GovernanceViewModel = {
  source: "mock" | "derived";
  ledgerRows: GovernanceLedgerRow[];
  advisorySignals: Array<{
    id: string;
    stack: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    cvss: string;
    note: string;
  }>;
  evidenceTrail: GovernanceEvidenceItem[];
  nistMeasure: GovernanceMetricCard;
  nistManage: GovernanceMetricCard;
};

const DEFAULT_NIST_MEASURE: GovernanceMetricCard = {
  mode: "TEVV-ACTIVE",
  label: "Detection Grounding",
  value: "99.2%",
  percent: 99,
};

const DEFAULT_NIST_MANAGE: GovernanceMetricCard = {
  mode: "CONTROL-LIVE",
  label: "HITL Response Time",
  value: "12.4s (Avg)",
  percent: 88,
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function detectDecision(messages: DashboardMessage[]): "authorized" | "aborted" | "unknown" {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== "user") continue;

    const text = extractRenderableText(m).toLowerCase();
    if (
      text.includes("authorization granted by operator") ||
      text.includes("mission authorized")
    ) {
      return "authorized";
    }
    if (
      text.includes("authorization denied by operator") ||
      text.includes("mission aborted")
    ) {
      return "aborted";
    }
  }

  return "unknown";
}

function hasApprovalContext(messages: DashboardMessage[]): boolean {
  return messages.some((m) => getApprovalContextFromMessage(m) != null);
}

function hasAuditorSummary(messages: DashboardMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    if (m.metadata?.agent_node === "auditor") return true;
  }
  return false;
}

function collectToolNames(messages: DashboardMessage[]): string[] {
  const names = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (
        typeof part === "object" &&
        part != null &&
        "toolName" in part &&
        typeof part.toolName === "string"
      ) {
        names.add(part.toolName.toLowerCase());
      }
    }
  }

  return [...names];
}

function toCvssSeverity(severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): string {
  if (severity === "CRITICAL") return "9.0";
  if (severity === "HIGH") return "7.5";
  if (severity === "MEDIUM") return "5.0";
  return "3.1";
}

function deriveAdvisorySignals(
  messages: DashboardMessage[],
  evidence: EvidencePackage | null,
): GovernanceViewModel["advisorySignals"] {
  const textBlob = messages
    .map((m) => extractRenderableText(m).toLowerCase())
    .join("\n");
  const tools = collectToolNames(messages);
  const advisories: GovernanceViewModel["advisorySignals"] = [];

  const hasTavily =
    tools.some((t) => t.includes("tavily")) || textBlob.includes("tavily");
  const hasWhois =
    tools.some((t) => t.includes("whois") || t.includes("rdap")) ||
    textBlob.includes("whois") ||
    textBlob.includes("rdap");

  if (hasWhois) {
    advisories.push({
      id: "ADV-2026-1001",
      stack: "Domain Registration Surface",
      severity: "MEDIUM",
      cvss: toCvssSeverity("MEDIUM"),
      note: "WHOIS/RDAP metadata indicates externally visible ownership and lifecycle exposure signals.",
    });
  }

  if (hasTavily) {
    advisories.push({
      id: "ADV-2026-1002",
      stack: "Public Recon Corroboration",
      severity: "LOW",
      cvss: toCvssSeverity("LOW"),
      note: "Open-source reconnaissance path confirmed by Tavily-based corroboration queries.",
    });
  }

  const warningCount = evidence?.warnings.length ?? 0;
  if (warningCount > 0 || evidence?.evidence_status === "degraded") {
    advisories.push({
      id: "ADV-2026-1003",
      stack: "Trace Integrity Controls",
      severity: warningCount > 0 ? "HIGH" : "MEDIUM",
      cvss: toCvssSeverity(warningCount > 0 ? "HIGH" : "MEDIUM"),
      note:
        warningCount > 0
          ? `Evidence ingestion reported ${warningCount} warning(s); validate trace completeness before final attestation.`
          : "Evidence pipeline is degraded; verify trace capture before relying on advisory conclusions.",
    });
  }

  if (advisories.length === 0) {
    return ADVISORY_MOCK.map((item) => ({
      id: item.id,
      stack: item.stack,
      severity: item.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
      cvss: item.cvss,
      note: "Scout detected matching version signal in observed public telemetry.",
    }));
  }

  return advisories;
}

function buildEvidenceTrailDerived(
  decision: "authorized" | "aborted" | "unknown",
  ledgerRows: GovernanceLedgerRow[],
  auditorPresent: boolean,
  evidence: EvidencePackage | null,
): GovernanceEvidenceItem[] {
  const traceCount = evidence?.traces.length ?? 0;
  const warningCount = evidence?.warnings.length ?? 0;
  const scoutAction = ledgerRows[0]?.action ?? "Tool Action";

  return [
    {
      label: "Vulnerability Triage",
      desc: `Primary recon path initiated via ${scoutAction}.`,
      id: "GOV-TRIAGE",
    },
    {
      label: "Human-in-the-Loop Gate",
      desc:
        decision === "authorized"
          ? "Tool execution authorized by operator under active policy."
          : decision === "aborted"
            ? "Operator aborted execution at policy gate."
            : "Awaiting explicit operator authorization signal.",
      id: "GOV-HITL",
    },
    {
      label: "Auditor Verification",
      desc: auditorPresent
        ? `Mission closure verified${
            traceCount > 0 ? ` with ${traceCount} linked trace(s).` : "."
          }${warningCount > 0 ? ` ${warningCount} warning(s) recorded.` : ""}`
        : "Auditor closure not yet present in transcript state.",
      id: "GOV-AUD",
    },
  ];
}

function buildNistMeasureCard(
  auditorPresent: boolean,
  evidence: EvidencePackage | null,
): GovernanceMetricCard {
  const traceCount = evidence?.traces.length ?? 0;
  const warningCount = evidence?.warnings.length ?? 0;
  const degraded = evidence?.evidence_status === "degraded";

  let score = 55;
  if (auditorPresent) score += 20;
  if (traceCount > 0) score += 15;
  score -= Math.min(20, warningCount * 10);
  if (degraded) score -= 10;

  const percent = clampPercent(score);

  return {
    mode: degraded ? "TEVV-DEGRADED" : "TEVV-ACTIVE",
    label: "Trace Completeness",
    value: `${percent.toFixed(1)}%`,
    percent,
  };
}

function buildNistManageCard(
  decision: "authorized" | "aborted" | "unknown",
): GovernanceMetricCard {
  if (decision === "authorized") {
    return {
      mode: "CONTROL-LIVE",
      label: "Gate Resolution",
      value: "AUTHORIZED",
      percent: 92,
    };
  }

  if (decision === "aborted") {
    return {
      mode: "CONTROL-LIVE",
      label: "Gate Resolution",
      value: "ABORTED",
      percent: 42,
    };
  }

  return {
    mode: "CONTROL-PENDING",
    label: "Gate Resolution",
    value: "PENDING",
    percent: 28,
  };
}

export function buildGovernanceViewModelFromData(
  messages: DashboardMessage[],
  evidence: EvidencePackage | null,
): GovernanceViewModel {
  if (messages.length === 0) {
    return {
      source: "mock",
      ledgerRows: [...LEDGER_MOCK] as unknown as GovernanceLedgerRow[],
      advisorySignals: deriveAdvisorySignals([], null),
      evidenceTrail: [...EVIDENCE_TRAIL],
      nistMeasure: DEFAULT_NIST_MEASURE,
      nistManage: DEFAULT_NIST_MANAGE,
    };
  }

  const decision = detectDecision(messages);
  const approvalPresent = hasApprovalContext(messages);
  if (!approvalPresent || decision === "unknown") {
    return {
      source: "mock",
      ledgerRows: [...LEDGER_MOCK] as unknown as GovernanceLedgerRow[],
      advisorySignals: deriveAdvisorySignals([], null),
      evidenceTrail: [...EVIDENCE_TRAIL],
      nistMeasure: DEFAULT_NIST_MEASURE,
      nistManage: DEFAULT_NIST_MANAGE,
    };
  }

  const ledgerRows = buildGovernanceLedgerRowsFromMessages(messages);
  const auditorPresent = hasAuditorSummary(messages);

  return {
    source: "derived",
    ledgerRows,
    advisorySignals: deriveAdvisorySignals(messages, evidence),
    evidenceTrail: buildEvidenceTrailDerived(
      decision,
      ledgerRows,
      auditorPresent,
      evidence,
    ),
    nistMeasure: buildNistMeasureCard(auditorPresent, evidence),
    nistManage: buildNistManageCard(decision),
  };
}

