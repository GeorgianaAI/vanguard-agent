import type { GovernanceLedgerRow } from "./buildGovernanceLedgerRows";

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
  /** Export / PDF identifiers (when evidence or thread context exists) */
  threadId?: string;
  missionId?: string;
  requestId?: string;
  evidenceStatus: "complete" | "degraded" | "unknown";
  evidenceWarnings: string[];
  advisoryEnrichmentWarnings: string[];
};

export type GovernanceCheckpointExtras = {
  vulnerabilities?: unknown;
  advisoryWarnings?: string[];
};

export type GovernanceBuildOptions = {
  threadId?: string;
};

export type ManageCardContext = {
  advisoryOverflowCount: number;
  advisoryEnrichmentWarnings: string[];
  evidenceStatus: GovernanceViewModel["evidenceStatus"];
};
