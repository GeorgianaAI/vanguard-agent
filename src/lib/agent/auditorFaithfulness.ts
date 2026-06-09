import type { VulnerabilityFinding } from "../vulnerability/vulnerabilityFinding";

const CVE_ID_RE = /CVE-\d{4}-\d+/gi;

// Matches a CVE ID followed by up to 20 non-word chars then a severity label.
// Catches: "CVE-2024-1234 (HIGH)", "CVE-2024-1234 — CRITICAL", "CVE-2024-1234: HIGH"
const CVE_WITH_SEV_RE = /(CVE-\d{4}-\d+)[^a-zA-Z0-9]{0,20}(CRITICAL|HIGH|MEDIUM|LOW)/gi;

const SEVERITY_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

/**
 * Programmatic faithfulness check on the Auditor's narrative.
 *
 * Check 1 — CVE grounding: every CVE ID cited must exist in advisory enrichment results.
 * Check 2 — Severity alignment: if a severity label is paired with a known CVE, it must not
 *   exceed the CVSS-derived severity on record.
 *
 * Returns one warning string per violation. Empty array means no issues found.
 */
export function checkAuditorFaithfulness(
  auditorText: string,
  vulnerabilities: VulnerabilityFinding[],
): string[] {
  if (!auditorText) return [];

  const warnings: string[] = [];
  const knownById = new Map(vulnerabilities.map((v) => [v.cveId.toUpperCase(), v]));

  // Check 1: CVE grounding
  const citedIds = new Set(
    Array.from(auditorText.matchAll(CVE_ID_RE)).map((m) => m[0].toUpperCase()),
  );

  for (const id of citedIds) {
    if (!knownById.has(id)) {
      warnings.push(`Auditor cited ${id} not found in advisory enrichment results`);
    }
  }

  // Check 2: Severity mismatch — auditor claims higher severity than enrichment record
  for (const match of auditorText.matchAll(CVE_WITH_SEV_RE)) {
    const cveId = match[1].toUpperCase();
    const claimedSev = match[2].toUpperCase();
    const record = knownById.get(cveId);
    if (!record) continue; // already captured by check 1
    const claimedRank = SEVERITY_RANK[claimedSev] ?? 0;
    const recordRank = SEVERITY_RANK[record.severity] ?? 0;
    if (claimedRank > recordRank) {
      warnings.push(
        `Auditor attributed ${claimedSev} to ${cveId} but enrichment record shows ${record.severity} (CVSS ${record.cvssScore.toFixed(1)})`,
      );
    }
  }

  return warnings;
}
