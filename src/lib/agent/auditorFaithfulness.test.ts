import { describe, it, expect } from "vitest";
import { checkAuditorFaithfulness } from "./auditorFaithfulness";
import type { VulnerabilityFinding } from "../vulnerability/vulnerabilityFinding";

function makeFinding(
  cveId: string,
  severity: VulnerabilityFinding["severity"],
  cvssScore: number,
): VulnerabilityFinding {
  return {
    findingId: `finding-${cveId}`,
    schemaVersion: 1,
    cveId,
    affectedComponent: "test-component",
    observedVersion: "1.0.0",
    severity,
    cvssScore,
    provenance: {
      primaryRiskSource: "NVD",
      primaryDetailSource: "NVD",
      enrichmentSources: [],
      sourceUrls: ["https://nvd.nist.gov/vuln/detail/" + cveId],
    },
    confidence: { level: "HIGH", score: 0.9, rationale: "NVD confirmed" },
    status: "OPEN",
    lastObservedAt: "2024-01-01T00:00:00Z",
    evidenceRefs: [],
  };
}

describe("checkAuditorFaithfulness", () => {
  it("returns no warnings for empty text", () => {
    expect(checkAuditorFaithfulness("", [])).toEqual([]);
  });

  it("returns no warnings when no CVEs are cited", () => {
    const findings = [makeFinding("CVE-2024-1234", "HIGH", 7.5)];
    expect(checkAuditorFaithfulness("No vulnerabilities found.", findings)).toEqual([]);
  });

  it("returns no warnings when cited CVE is in enrichment results", () => {
    const findings = [makeFinding("CVE-2024-1234", "HIGH", 7.5)];
    expect(checkAuditorFaithfulness("Found CVE-2024-1234 in the scan.", findings)).toEqual([]);
  });

  it("warns when cited CVE is not in enrichment results", () => {
    const findings = [makeFinding("CVE-2024-9999", "LOW", 2.0)];
    const warnings = checkAuditorFaithfulness("Found CVE-2024-1234 in the scan.", findings);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/CVE-2024-1234/);
    expect(warnings[0]).toMatch(/not found in advisory enrichment results/);
  });

  it("warns for each uncorroborated CVE when multiple are cited", () => {
    const findings = [makeFinding("CVE-2024-1111", "MEDIUM", 5.0)];
    const text = "Findings: CVE-2024-1111 and CVE-2024-2222 and CVE-2024-3333.";
    const warnings = checkAuditorFaithfulness(text, findings);
    expect(warnings).toHaveLength(2);
    expect(warnings.some((w) => w.includes("CVE-2024-2222"))).toBe(true);
    expect(warnings.some((w) => w.includes("CVE-2024-3333"))).toBe(true);
  });

  it("deduplicates repeated CVE citations", () => {
    const findings: VulnerabilityFinding[] = [];
    const text = "CVE-2024-1234 is severe. CVE-2024-1234 should be patched.";
    const warnings = checkAuditorFaithfulness(text, findings);
    expect(warnings).toHaveLength(1);
  });

  it("returns no warnings when empty vulnerabilities and no CVEs cited", () => {
    expect(checkAuditorFaithfulness("Target appears clean.", [])).toEqual([]);
  });

  it("warns on severity inflation — auditor claims HIGH for a MEDIUM finding", () => {
    const findings = [makeFinding("CVE-2024-1234", "MEDIUM", 5.0)];
    const warnings = checkAuditorFaithfulness("CVE-2024-1234 (HIGH) requires patching.", findings);
    expect(warnings.some((w) => w.includes("CVE-2024-1234") && w.includes("HIGH") && w.includes("MEDIUM"))).toBe(true);
  });

  it("warns on severity inflation — auditor claims CRITICAL for a HIGH finding", () => {
    const findings = [makeFinding("CVE-2024-5678", "HIGH", 8.0)];
    const warnings = checkAuditorFaithfulness("CVE-2024-5678 — CRITICAL vulnerability.", findings);
    expect(warnings.some((w) => w.includes("CVE-2024-5678") && w.includes("CRITICAL") && w.includes("HIGH"))).toBe(true);
  });

  it("does not warn when severity matches the enrichment record", () => {
    const findings = [makeFinding("CVE-2024-1234", "HIGH", 7.8)];
    const warnings = checkAuditorFaithfulness("CVE-2024-1234 (HIGH) was correlated.", findings);
    expect(warnings.filter((w) => w.includes("attributed"))).toHaveLength(0);
  });

  it("does not warn when auditor downgrades severity relative to the record", () => {
    const findings = [makeFinding("CVE-2024-1234", "CRITICAL", 9.5)];
    const warnings = checkAuditorFaithfulness("CVE-2024-1234 (HIGH) — treat as high priority.", findings);
    expect(warnings.filter((w) => w.includes("attributed"))).toHaveLength(0);
  });

  it("is case-insensitive for CVE IDs", () => {
    const findings = [makeFinding("CVE-2024-1234", "HIGH", 7.5)];
    expect(checkAuditorFaithfulness("cve-2024-1234 found.", findings)).toEqual([]);
  });
});
