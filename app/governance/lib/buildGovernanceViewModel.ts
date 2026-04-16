import type { DashboardMessage } from "@/app/dashboard/lib/types";
import {
  extractRenderableText,
  getApprovalContextFromMessage,
} from "@/app/dashboard/lib/utils";
import type { EvidencePackage } from "@/src/lib/audit/evidence";
import type { VulnerabilityFinding } from "@/src/lib/vulnerability/vulnerabilityFinding";
import { LEDGER_MOCK, EVIDENCE_TRAIL } from "../governance-mock-data";
import {
  buildGovernanceLedgerRowsFromMessages,
  type GovernanceLedgerRow,
} from "./buildGovernanceLedgerRows";
import { parseCheckpointVulnerabilities } from "./parseCheckpointVulnerabilities";
import {
  DEFAULT_NIST_MEASURE,
  DEFAULT_NIST_MANAGE,
  EMPTY_EXPORT_FIELDS,
} from "./governanceViewModel.constants";
import { buildNistMeasureCard, buildNistManageCard } from "./governanceNistCards";
import { deriveAdvisorySignals } from "./governanceAdvisorySignals";

// Re-export everything previously exported from this file so existing import paths don't break.
export type {
  GovernanceEvidenceItem,
  GovernanceMetricCard,
  GovernanceViewModel,
  GovernanceCheckpointExtras,
  GovernanceBuildOptions,
  ManageCardContext,
} from "./governanceViewModel.types";
export { GOVERNANCE_ADVISORY_TOP_N } from "./governanceViewModel.constants";

// Local type aliases for internal use.
import type {
  GovernanceViewModel,
  GovernanceCheckpointExtras,
  GovernanceBuildOptions,
  GovernanceEvidenceItem,
  ManageCardContext,
} from "./governanceViewModel.types";

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

function buildEvidenceTrailDerived(
  decision: "authorized" | "aborted" | "unknown",
  ledgerRows: GovernanceLedgerRow[],
  auditorPresent: boolean,
  evidence: EvidencePackage | null,
  vulnerabilities: VulnerabilityFinding[],
  advisoryEnrichmentWarnings: string[],
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

  const advisoryPipe: GovernanceEvidenceItem[] =
    advisoryEnrichmentWarnings.length > 0
      ? [
          {
            label: "Advisory Pipeline",
            desc: advisoryEnrichmentWarnings.join(" • "),
            id: "GOV-ADV-PIPE",
          },
        ]
      : [];

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

  return [triage, ...cveEvents, ...advisoryPipe, hitl, aud];
}

export function buildGovernanceViewModelFromData(
  messages: DashboardMessage[],
  evidence: EvidencePackage | null,
  extras?: GovernanceCheckpointExtras,
  opts?: GovernanceBuildOptions,
): GovernanceViewModel {
  const checkpointFindings = parseCheckpointVulnerabilities(
    extras?.vulnerabilities,
  );
  const advisoryWarn = extras?.advisoryWarnings ?? [];

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
      threadId: opts?.threadId,
      missionId: evidence?.mission_id,
      requestId: evidence?.request_id,
      ...EMPTY_EXPORT_FIELDS,
      advisoryEnrichmentWarnings: advisoryWarn,
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
      threadId: opts?.threadId,
      missionId: evidence?.mission_id,
      requestId: evidence?.request_id,
      ...EMPTY_EXPORT_FIELDS,
      advisoryEnrichmentWarnings: advisoryWarn,
    };
  }

  const ledgerRows = buildGovernanceLedgerRowsFromMessages(messages);
  const auditorPresent = hasAuditorSummary(messages);
  const adv = deriveAdvisorySignals(messages, evidence, checkpointFindings);

  const manageCtx: ManageCardContext = {
    advisoryOverflowCount: adv.overflow,
    advisoryEnrichmentWarnings: advisoryWarn,
    evidenceStatus: evidence?.evidence_status ?? "unknown",
  };

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
      advisoryWarn,
    ),
    nistMeasure: buildNistMeasureCard(
      auditorPresent,
      evidence,
      checkpointFindings,
    ),
    nistManage: buildNistManageCard(decision, manageCtx),
    threadId: opts?.threadId,
    missionId: evidence?.mission_id,
    requestId: evidence?.request_id,
    evidenceStatus: evidence?.evidence_status ?? "unknown",
    evidenceWarnings: evidence?.warnings ?? [],
    advisoryEnrichmentWarnings: advisoryWarn,
  };
}
