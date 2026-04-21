import type { EvidencePackage } from "@/src/lib/audit/evidence";
import type { VulnerabilityFinding } from "@/src/lib/vulnerability/vulnerabilityFinding";
import type { GovernanceMetricCard, ManageCardContext } from "./governanceViewModel.types";

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export function buildNistMeasureCard(
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
    label: critical + high > 0 ? "Trace + Advisory Exposure" : "Trace Completeness",
    value: `${percent.toFixed(1)}%`,
    percent,
  };
}

/** NIST Manage: HITL gate outcome, with small penalties when trace/advisory posture is stressed. */
export function buildNistManageCard(
  decision: "authorized" | "aborted" | "unknown",
  ctx?: ManageCardContext,
): GovernanceMetricCard {
  let percent: number;
  let mode: string;
  let label: string;
  let value: string;

  if (decision === "authorized") {
    mode = "CONTROL-LIVE";
    label = "Gate Resolution";
    value = "AUTHORIZED";
    percent = 92;
  } else if (decision === "aborted") {
    mode = "CONTROL-LIVE";
    label = "Gate Resolution";
    value = "ABORTED";
    percent = 42;
  } else {
    mode = "CONTROL-PENDING";
    label = "Gate Resolution";
    value = "PENDING";
    percent = 28;
  }

  if (ctx) {
    if (ctx.evidenceStatus === "degraded") {
      percent -= 10;
    }
    if (ctx.advisoryEnrichmentWarnings.length > 0) {
      percent -= Math.min(12, ctx.advisoryEnrichmentWarnings.length * 3);
    }
    if (ctx.advisoryOverflowCount > 0) {
      percent -= Math.min(10, ctx.advisoryOverflowCount * 2);
    }
    percent = clampPercent(percent);
    if (
      ctx.evidenceStatus === "degraded" ||
      ctx.advisoryEnrichmentWarnings.length > 0 ||
      ctx.advisoryOverflowCount > 0
    ) {
      label = "Gate + oversight posture";
    }
  }

  return { mode, label, value, percent };
}
