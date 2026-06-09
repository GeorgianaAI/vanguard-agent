import type { GovernanceMetricCard } from "./governanceViewModel.types";

export const DEFAULT_NIST_MEASURE: GovernanceMetricCard = {
  mode: "TEVV-ACTIVE",
  label: "Detection Grounding",
  value: "99.2%",
  percent: 99,
};

export const DEFAULT_NIST_MANAGE: GovernanceMetricCard = {
  mode: "CONTROL-LIVE",
  label: "HITL Response Time",
  value: "12.4s (Avg)",
  percent: 88,
};

/** Top advisory cards shown; remainder counted as overflow. */
export const GOVERNANCE_ADVISORY_TOP_N = 3;

export const EMPTY_EXPORT_FIELDS = {
  evidenceStatus: "unknown" as const,
  evidenceWarnings: [] as string[],
  advisoryEnrichmentWarnings: [] as string[],
  faithfulnessWarnings: [] as string[],
};
