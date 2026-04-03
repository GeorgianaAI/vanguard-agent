import type { DashboardMessage } from "@/app/dashboard/lib/types";
import {
  extractRenderableText,
  getApprovalContextFromMessage,
} from "@/app/dashboard/lib/utils";
import type { EvidencePackage } from "@/src/lib/audit/evidence";
import type { VulnerabilityFinding } from "@/src/lib/vulnerability/vulnerabilityFinding";

import {
  ADVISORY_MOCK,
  EVIDENCE_TRAIL,
  LEDGER_MOCK,
} from "../governance-mock-data";
import {
  buildGovernanceLedgerRowsFromMessages,
  type GovernanceLedgerRow,
} from "./buildGovernanceLedgerRows";
import { parseCheckpointVulnerabilities } from "./parseCheckpointVulnerabilities";

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
    remediationHint: string;
    confidenceLevel?: "HIGH" | "MEDIUM" | "LOW";
  }>;
  /** Count of findings above top-N display cap */
  advisoryOverflowCount: number;
  evidenceTrail: GovernanceEvidenceItem[];
  nistMeasure: GovernanceMetricCard;
  nistManage: GovernanceMetricCard;
};

export type GovernanceCheckpointExtras = {
  vulnerabilities?: unknown;
  advisoryWarnings?: string[];
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

/** Top advisory cards shown; remainder counted as overflow. */
export const GOVERNANCE_ADVISORY_TOP_N = 3;

function mapFindingToAdvisoryCard(
  f: VulnerabilityFinding,
): GovernanceViewModel["advisorySignals"][number] {
  return {
    id: f.cveId,
    stack: `${f.affectedComponent} · ${f.observedVersion}`.trim(),
    severity: f.severity,
    cvss: f.cvssScore.toFixed(1),
    note: f.confidence.rationale.slice(0, 280),
    remediationHint: `Review vendor advisory for ${f.cveId}; treat as ${f.confidence.level} confidence OSINT correlation.`,
    confidenceLevel: f.confidence.level,
  };
}

function deriveAdvisorySignals(
  messages: DashboardMessage[],
  evidence: EvidencePackage | null,
  checkpointFindings: VulnerabilityFinding[],
): {
  signals: GovernanceViewModel["advisorySignals"];
  overflow: number;
} {
  if (checkpointFindings.length > 0) {
    const sorted = [...checkpointFindings].sort(
      (a, b) => b.cvssScore - a.cvssScore,
    );
    const top = sorted.slice(0, GOVERNANCE_ADVISORY_TOP_N).map(mapFindingToAdvisoryCard);
    return {
      signals: top,
      overflow: Math.max(0, sorted.length - GOVERNANCE_ADVISORY_TOP_N),
    };
  }

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
      remediationHint:
        "Validate registrar exposure against organizational domain policy.",
    });
  }

  if (hasTavily) {
    advisories.push({
      id: "ADV-2026-1002",
      stack: "Public Recon Corroboration",
      severity: "LOW",
      cvss: toCvssSeverity("LOW"),
      note: "Open-source reconnaissance path confirmed by Tavily-based corroboration queries.",
      remediationHint: "Corroborate public references independently where feasible.",
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
      remediationHint: "Re-run mission or verify LangSmith trace capture before attestation.",
    });
  }

  if (advisories.length === 0) {
    return {
      signals: ADVISORY_MOCK.map((item) => ({
        id: item.id,
        stack: item.stack,
        severity: item.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        cvss: item.cvss,
        note: "Scout detected matching version signal in observed public telemetry.",
        remediationHint:
          "Patch or validate against vendor guidance; confirm with secondary OSINT sources.",
      })),
      overflow: Math.max(0, ADVISORY_MOCK.length - GOVERNANCE_ADVISORY_TOP_N),
    };
  }

  return {
    signals: advisories.slice(0, GOVERNANCE_ADVISORY_TOP_N),
    overflow: Math.max(0, advisories.length - GOVERNANCE_ADVISORY_TOP_N),
  };
}

function buildEvidenceTrailDerived(
  decision: "authorized" | "aborted" | "unknown",
  ledgerRows: GovernanceLedgerRow[],
  auditorPresent: boolean,
  evidence: EvidencePackage | null,
  vulnerabilities: VulnerabilityFinding[],
): GovernanceEvidenceItem[] {
  const traceCount = evidence?.traces.length ?? 0;
  const warningCount = evidence?.warnings.length ?? 0;
  const scoutAction = ledgerRows[0]?.action ?? "Tool Action";

  const triage: GovernanceEvidenceItem = {
    label: "Vulnerability Triage",
    desc:
      vulnerabilities.length > 0
        ? `Recon signals correlated with ${vulnerabilities.length} checkpointed public CVE record(s) (defensive OSINT). Primary path: ${scoutAction}.`
        : `Primary recon path initiated via ${scoutAction}.`,
    id: "GOV-TRIAGE",
  };

  const cveEvents: GovernanceEvidenceItem[] = vulnerabilities
    .slice(0, 3)
    .map((v, i) => ({
      label: "Public Advisory Correlation",
      desc: `${v.cveId} — ${v.severity} (CVSS ${v.cvssScore.toFixed(1)}). ${v.confidence.rationale.slice(0, 120)}${v.confidence.rationale.length > 120 ? "…" : ""}`,
      id: `GOV-CVE-${String(i + 1).padStart(2, "0")}`,
    }));

  const hitl: GovernanceEvidenceItem = {
    label: "Human-in-the-Loop Gate",
    desc:
      decision === "authorized"
        ? "Tool execution authorized by operator under active policy."
        : decision === "aborted"
          ? "Operator aborted execution at policy gate."
          : "Awaiting explicit operator authorization signal.",
    id: "GOV-HITL",
  };

  const aud: GovernanceEvidenceItem = {
    label: "Auditor Verification",
    desc: auditorPresent
      ? `Mission closure verified${
          traceCount > 0 ? ` with ${traceCount} linked trace(s).` : "."
        }${warningCount > 0 ? ` ${warningCount} warning(s) recorded.` : ""}`
      : "Auditor closure not yet present in transcript state.",
    id: "GOV-AUD",
  };

  return [triage, ...cveEvents, hitl, aud];
}

function buildNistMeasureCard(
  auditorPresent: boolean,
  evidence: EvidencePackage | null,
  vulnerabilities: VulnerabilityFinding[],
): GovernanceMetricCard {
  const traceCount = evidence?.traces.length ?? 0;
  const warningCount = evidence?.warnings.length ?? 0;
  const degraded = evidence?.evidence_status === "degraded";

  const critical = vulnerabilities.filter((v) => v.severity === "CRITICAL").length;
  const high = vulnerabilities.filter((v) => v.severity === "HIGH").length;

  let score = 55;
  if (auditorPresent) score += 20;
  if (traceCount > 0) score += 15;
  score -= Math.min(20, warningCount * 10);
  if (degraded) score -= 10;
  score -= Math.min(22, critical * 11 + high * 5);

  const percent = clampPercent(score);

  return {
    mode: degraded ? "TEVV-DEGRADED" : "TEVV-ACTIVE",
    label:
      critical + high > 0
        ? "Trace + Advisory Exposure"
        : "Trace Completeness",
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
  extras?: GovernanceCheckpointExtras,
): GovernanceViewModel {
  const checkpointFindings = parseCheckpointVulnerabilities(
    extras?.vulnerabilities,
  );

  if (messages.length === 0) {
    const adv = deriveAdvisorySignals([], null, checkpointFindings);
    return {
      source: "mock",
      ledgerRows: [...LEDGER_MOCK] as unknown as GovernanceLedgerRow[],
      advisorySignals: adv.signals,
      advisoryOverflowCount: adv.overflow,
      evidenceTrail: [...EVIDENCE_TRAIL],
      nistMeasure: DEFAULT_NIST_MEASURE,
      nistManage: DEFAULT_NIST_MANAGE,
    };
  }

  const decision = detectDecision(messages);
  const approvalPresent = hasApprovalContext(messages);
  if (!approvalPresent || decision === "unknown") {
    const adv = deriveAdvisorySignals([], null, checkpointFindings);
    return {
      source: "mock",
      ledgerRows: [...LEDGER_MOCK] as unknown as GovernanceLedgerRow[],
      advisorySignals: adv.signals,
      advisoryOverflowCount: adv.overflow,
      evidenceTrail: [...EVIDENCE_TRAIL],
      nistMeasure: DEFAULT_NIST_MEASURE,
      nistManage: DEFAULT_NIST_MANAGE,
    };
  }

  const ledgerRows = buildGovernanceLedgerRowsFromMessages(messages);
  const auditorPresent = hasAuditorSummary(messages);
  const adv = deriveAdvisorySignals(messages, evidence, checkpointFindings);

  return {
    source: "derived",
    ledgerRows,
    advisorySignals: adv.signals,
    advisoryOverflowCount: adv.overflow,
    evidenceTrail: buildEvidenceTrailDerived(
      decision,
      ledgerRows,
      auditorPresent,
      evidence,
      checkpointFindings,
    ),
    nistMeasure: buildNistMeasureCard(
      auditorPresent,
      evidence,
      checkpointFindings,
    ),
    nistManage: buildNistManageCard(decision),
  };
}

