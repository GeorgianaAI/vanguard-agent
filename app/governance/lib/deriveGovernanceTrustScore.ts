import type { GovernanceViewModel } from "./buildGovernanceViewModel";

type GovernanceTrustDerived = {
  mode: "derived";
  /** Single headline percent (0–100), one decimal in display */
  percent: number;
  formatted: string;
};

type GovernanceTrustIllustrative = {
  mode: "illustrative";
  /** No numeric precision — mock / insufficient transcript for derivation */
  primaryDisplay: "—";
  caption: "Illustrative";
};

export type GovernanceTrustDisplay =
  | GovernanceTrustDerived
  | GovernanceTrustIllustrative;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 10) / 10;
}

/**
 * System Trust headline for the governance header.
 *
 * - `derived`: weighted blend of NIST Measure (telemetry/trace exposure) and
 *   NIST Manage (HITL gate outcome), then penalties for degraded evidence,
 *   evidence warnings, advisory enrichment noise, and advisory overflow.
 * - `illustrative`: sessions without a derived ledger (mock rows, missing
 *   approval context) — show no fake precision.
 */
export function deriveGovernanceTrustScore(
  model: GovernanceViewModel,
): GovernanceTrustDisplay {
  if (model.source !== "derived") {
    return {
      mode: "illustrative",
      primaryDisplay: "—",
      caption: "Illustrative",
    };
  }

  let blended =
    0.62 * model.nistMeasure.percent + 0.38 * model.nistManage.percent;

  if (model.evidenceStatus === "degraded") {
    blended -= 8;
  } else if (model.evidenceStatus === "unknown") {
    blended -= 4;
  }

  if (model.evidenceWarnings.length > 0) {
    blended -= Math.min(14, model.evidenceWarnings.length * 4);
  }

  if (model.advisoryEnrichmentWarnings.length > 0) {
    blended -= Math.min(14, model.advisoryEnrichmentWarnings.length * 3);
  }

  if (model.advisoryOverflowCount > 0) {
    blended -= Math.min(10, model.advisoryOverflowCount * 2);
  }

  const percent = clampPercent(blended);
  return {
    mode: "derived",
    percent,
    formatted: `${percent.toFixed(1)}%`,
  };
}
