import type { DashboardMessage } from "@/app/dashboard/lib/types";
import { extractRenderableText } from "@/app/dashboard/lib/utils";
import type { EvidencePackage } from "@/src/lib/audit/evidence";
import type { VulnerabilityFinding } from "@/src/lib/vulnerability/vulnerabilityFinding";
import type { GovernanceViewModel } from "./governanceViewModel.types";
import { GOVERNANCE_ADVISORY_TOP_N } from "./governanceViewModel.constants";
import { ADVISORY_MOCK } from "../governance-mock-data";

function toCvssSeverity(severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): string {
  if (severity === "CRITICAL") return "9.0";
  if (severity === "HIGH") return "7.5";
  if (severity === "MEDIUM") return "5.0";
  return "3.1";
}

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

export function collectToolNames(messages: DashboardMessage[]): string[] {
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

export function deriveAdvisorySignals(
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
